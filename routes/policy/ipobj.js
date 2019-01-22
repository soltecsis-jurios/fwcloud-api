var express = require('express');
var router = express.Router();
var Policy_r__ipobjModel = require('../../models/policy/policy_r__ipobj');
var Policy_r__interfaceModel = require('../../models/policy/policy_r__interface');
var api_resp = require('../../utils/api_response');
var Policy_rModel = require('../../models/policy/policy_r');
var Policy_cModel = require('../../models/policy/policy_c');

var logger = require('log4js').getLogger("app");
var utilsModel = require("../../utils/utils.js");

var objModel = "Ipobj in Rule";


/* Create New policy_r__ipobj */
router.post("/",
utilsModel.disableFirewallCompileStatus,
async (req, res) => {
	//Create New objet with data policy_r__ipobj
	var policy_r__ipobjData = {
		rule: req.body.rule,
		ipobj: req.body.ipobj,
		ipobj_g: req.body.ipobj_g,
		interface: req.body.interface,
		position: req.body.position,
		position_order: req.body.position_order
	};

	/* Before inserting the new IP object into the rule, verify that there is no container in the 
	destination position that already contains it. */
	try {
		const found = await Policy_r__ipobjModel.checkExistsInPosition(policy_r__ipobjData);
		if (found)
		 return api_resp.getJson(null, api_resp.ACR_ALREADY_EXISTS, 'Object already exists in this rule position.', objModel, null, jsonResp => res.status(200).json(jsonResp));
		
		 const data = await Policy_r__ipobjModel.insertPolicy_r__ipobj(policy_r__ipobjData, 0);
			//If saved policy_r__ipobj Get data
			if (data && data.result) {
				if (data.result && data.allowed) {
					var accessData = { sessionID: req.sessionID, iduser: req.session.user_id, fwcloud: req.body.fwcloud, idfirewall: req.body.firewall, rule: policy_r__ipobjData.rule };
					Policy_rModel.compilePolicy_r(accessData, function(error, datac) {});
					api_resp.getJson(data, api_resp.ACR_INSERTED_OK, 'INSERTED OK', objModel, null, jsonResp => res.status(200).json(jsonResp));
				} else if (!data.allowed)
					api_resp.getJson(data, api_resp.ACR_NOT_ALLOWED, 'IPOBJ not allowed in this position', objModel, error, jsonResp => res.status(200).json(jsonResp));
				else
					api_resp.getJson(data, api_resp.ACR_NOTEXIST, 'IPOBJ not found', objModel, error, jsonResp => res.status(200).json(jsonResp));
			} else
				api_resp.getJson(data, api_resp.ACR_DATA_ERROR, 'Error inserting', objModel, error, jsonResp => res.status(200).json(jsonResp));
	} catch(error) { api_resp.getJson(null, api_resp.ACR_ERROR, '', '', error, jsonResp => res.status(200).json(jsonResp)) }
});


/* Update POSITION policy_r__ipobj that exist */
router.put('/move',
utilsModel.disableFirewallCompileStatus,
(req, res) => {
	var firewall = req.body.firewall;
	var rule = req.body.rule;
	var ipobj = req.body.ipobj;
	var ipobj_g = req.body.ipobj_g;
	var interface = req.body.interface;
	var position = req.body.position;
	var position_order = req.body.position_order;
	var new_rule = req.body.new_rule;
	var new_position = req.body.new_position;
	var new_order = req.body.new_order;

	var content1 = 'O',
		content2 = 'O';

	var accessData = {
		sessionID: req.sessionID,
		iduser: req.session.user_id,
		fwcloud: req.body.fwcloud,
		idfirewall: firewall,
		rule: rule
	};

	logger.debug("POLICY_R-IPOBJS  MOVING FROM POSITION " + position + "  TO POSITION: " + new_position);

	var policy_r__ipobjData = {
		rule: new_rule,
		ipobj: ipobj,
		ipobj_g: ipobj_g,
		interface: interface,
		position: new_position,
		position_order: new_order
	};

	// Invalidate compilation of the affected rules.
	Policy_cModel.deletePolicy_c(firewall, rule)
		.then(() => Policy_cModel.deletePolicy_c(firewall, new_rule))
		/* Before inserting the new IP object into the rule, verify that there is no container in the 
		destination position that already contains it. */
		.then(() => Policy_r__ipobjModel.checkExistsInPosition(policy_r__ipobjData))
		.then(found => {
			if (found)
				api_resp.getJson(null, api_resp.ACR_ALREADY_EXISTS, 'Object already exists in this rule position.', objModel, null, jsonResp => res.status(200).json(jsonResp));
			else {
				//Get position type
				Policy_r__ipobjModel.getTypePositions(position, new_position, async (error, data) => {
					logger.debug(data);
					if (data) {
						content1 = data.content1;
						content2 = data.content2;

						if (content1 === content2) { //SAME POSITION
							Policy_r__ipobjModel.updatePolicy_r__ipobj_position(rule, ipobj, ipobj_g, interface, position, position_order, new_rule, new_position, new_order, (error, data) => {
								//If saved policy_r__ipobj saved ok, get data
								if (data) {
									if (data.result) {
										Policy_rModel.compilePolicy_r(accessData, function(error, datac) {});
										accessData.rule = new_rule;
										Policy_rModel.compilePolicy_r(accessData, function(error, datac) {});
										api_resp.getJson(data, api_resp.ACR_UPDATED_OK, 'UPDATED OK', objModel, null, function(jsonResp) {
											res.status(200).json(jsonResp);
										});
									} else if (!data.allowed) {
										api_resp.getJson(data, api_resp.ACR_NOT_ALLOWED, 'IPOBJ not allowed in this position', objModel, error, function(jsonResp) {
											res.status(200).json(jsonResp);
										});
									} else
										api_resp.getJson(data, api_resp.ACR_NOTEXIST, 'IPOBJ not found', objModel, error, function(jsonResp) {
											res.status(200).json(jsonResp);
										});
								} else {
									api_resp.getJson(data, api_resp.ACR_DATA_ERROR, 'Error updating', objModel, error, function(jsonResp) {
										res.status(200).json(jsonResp);
									});
								}
							});
						} else { //DIFFERENTS POSITIONS
							if (content1 === 'I' && content2 === 'O') {
								//Create New Position 'O'
								//Create New objet with data policy_r__ipobj
								var policy_r__ipobjData = {
									rule: new_rule,
									ipobj: ipobj,
									ipobj_g: ipobj_g,
									interface: interface,
									position: new_position,
									position_order: new_order
								};

								var data;
								try {
									data = await Policy_r__ipobjModel.insertPolicy_r__ipobj(policy_r__ipobjData, 0);
								} catch(error) { return api_resp.getJson(null, api_resp.ACR_ERROR, '', '', error, jsonResp => res.status(200).json(jsonResp)) }

								//If saved policy_r__ipobj Get data
								if (data) {
									if (data.result) {
										//Delete position 'I'
										Policy_r__interfaceModel.deletePolicy_r__interface(rule, interface, position, position_order, function(error, data) {
											if (data && data.result) {
												Policy_rModel.compilePolicy_r(accessData, function(error, datac) {});
												accessData.rule = new_rule;
												Policy_rModel.compilePolicy_r(accessData, function(error, datac) {});
												api_resp.getJson(data, api_resp.ACR_UPDATED_OK, 'UPDATED OK', objModel, null, function(jsonResp) {
													res.status(200).json(jsonResp);
												});
											} else {
												api_resp.getJson(data, api_resp.ACR_DATA_ERROR, 'Error updating', objModel, error, function(jsonResp) {
													res.status(200).json(jsonResp);
												});
											}
										});
									} else if (!data.allowed) {
										api_resp.getJson(data, api_resp.ACR_NOT_ALLOWED, 'IPOBJ not allowed in this position', objModel, error, function(jsonResp) {
											res.status(200).json(jsonResp);
										});
									} else
										api_resp.getJson(data, api_resp.ACR_NOTEXIST, 'IPOBJ not found', objModel, error, function(jsonResp) {
											res.status(200).json(jsonResp);
										});

								} else {
									api_resp.getJson(data, api_resp.ACR_DATA_ERROR, 'Error updating', objModel, error, function(jsonResp) {
										res.status(200).json(jsonResp);
									});
								}
							} else {
								api_resp.getJson(data, api_resp.ACR_DATA_ERROR, 'Error updating, content diffetents', objModel, error, function(jsonResp) {
									res.status(200).json(jsonResp);
								});
							}
						}
					} else {
						api_resp.getJson(data, api_resp.ACR_DATA_ERROR, 'Error updating, data error', objModel, error, function(jsonResp) {
							res.status(200).json(jsonResp);
						});
					}
				});
			}
		})
		.catch(error => api_resp.getJson(null, api_resp.ACR_ERROR, '', '', error, jsonResp => res.status(200).json(jsonResp)));
});

/* Update ORDER policy_r__ipobj that exist */
router.put('/order',
utilsModel.disableFirewallCompileStatus,
(req, res) => {
	var rule = req.body.rule;
	var ipobj = req.body.ipobj;
	var ipobj_g = req.body.ipobj_g;
	var interface = req.body.interface;
	var position = req.body.position;
	var position_order = req.body.position_order;
	var new_order = req.body.new_order;

	Policy_r__ipobjModel.updatePolicy_r__ipobj_position_order(rule, ipobj, ipobj_g, interface, position, position_order, new_order, function(error, data) {
		if (error)
			api_resp.getJson(data, api_resp.ACR_ERROR, '', objModel, error, function(jsonResp) {
				res.status(200).json(jsonResp);
			});
		else {
			//If saved policy_r__ipobj saved ok, get data
			if (data && data.result) {
				var accessData = { sessionID: req.sessionID, iduser: req.session.user_id, fwcloud: req.body.fwcloud, idfirewall: req.body.firewall, rule: rule };
				Policy_rModel.compilePolicy_r(accessData, function(error, datac) {});
				api_resp.getJson(data, api_resp.ACR_UPDATED_OK, 'SET ORDER OK', objModel, null, function(jsonResp) {
					res.status(200).json(jsonResp);
				});
			} else {
				api_resp.getJson(data, api_resp.ACR_DATA_ERROR, 'Error updating', objModel, error, function(jsonResp) {
					res.status(200).json(jsonResp);
				});
			}
		}
	});
});


/* Get all policy_r__ipobjs by rule*/
router.put('/get', (req, res) => {
	Policy_r__ipobjModel.getPolicy_r__ipobjs(req.body.rule, (error, data) => {
		//If exists policy_r__ipobj get data
		if (data && data.length > 0)
			api_resp.getJson(data, api_resp.ACR_OK, '', objModel, null, jsonResp => res.status(200).json(jsonResp));
		else
			api_resp.getJson(data, api_resp.ACR_NOTEXIST, ' not found', objModel, null, jsonResp => res.status(200).json(jsonResp));
	});
});


/* Update NEGATE policy_r__ipobj that exist */
/* Update ALL IPOBJ/POLICY_R TO new NEGATE satus*/
router.put('/negate',
utilsModel.disableFirewallCompileStatus,
(req, res) => {
	var rule = req.body.rule;
	var position = req.body.position;
	var negate = req.body.negate;

	Policy_r__ipobjModel.updatePolicy_r__ipobj_negate(rule, position, negate, function(error, data) {
		if (error)
			api_resp.getJson(data, api_resp.ACR_ERROR, '', objModel, error, function(jsonResp) {
				res.status(200).json(jsonResp);
			});
		else {
			//If saved policy_r__ipobj saved ok, get data
			if (data && data.result) {
				var accessData = { sessionID: req.sessionID, iduser: req.session.user_id, fwcloud: req.body.fwcloud, idfirewall: req.body.firewall, rule: rule };
				Policy_rModel.compilePolicy_r(accessData, function(error, datac) {});
				api_resp.getJson(data, api_resp.ACR_UPDATED_OK, 'SET NEGATED OK', objModel, null, function(jsonResp) {
					res.status(200).json(jsonResp);
				});
			} else {
				api_resp.getJson(data, api_resp.ACR_DATA_ERROR, 'Error updating', objModel, error, function(jsonResp) {
					res.status(200).json(jsonResp);
				});
			}
		}
	});
});


/* Remove policy_r__ipobj */
router.put("/del",
utilsModel.disableFirewallCompileStatus,
(req, res) => {
	//Id from policy_r__ipobj to remove
	var rule = req.body.rule;
	var ipobj = req.body.ipobj;
	var ipobj_g = req.body.ipobj_g;
	var interface = req.body.interface;
	var position = req.body.position;
	var position_order = req.body.position_order;

	Policy_r__ipobjModel.deletePolicy_r__ipobj(rule, ipobj, ipobj_g, interface, position, position_order, function(error, data) {
		if (data && data.result) {
			if (data.msg === "deleted") {
				var accessData = { sessionID: req.sessionID, iduser: req.session.user_id, fwcloud: req.body.fwcloud, idfirewall: req.body.firewall, rule: rule };
				Policy_rModel.compilePolicy_r(accessData, function(error, datac) {});
				api_resp.getJson(data, api_resp.ACR_DELETED_OK, 'DELETE OK', objModel, null, function(jsonResp) {
					res.status(200).json(jsonResp);
				});
			} else if (data.msg === "notExist") {
				api_resp.getJson(data, api_resp.ACR_NOTEXIST, '', objModel, null, function(jsonResp) {
					res.status(200).json(jsonResp);
				});
			}
		} else {
			api_resp.getJson(data, api_resp.ACR_DATA_ERROR, 'Error updating', objModel, error, function(jsonResp) {
				res.status(200).json(jsonResp);
			});
		}
	});
});


module.exports = router;