var express = require('express');
var router = express.Router();
const policy_r__interfaceModel = require('../../models/policy/policy_r__interface');
const policy_r__ipobjModel = require('../../models/policy/policy_r__ipobj');
const policy_rModel = require('../../models/policy/policy_r');
const policy_cModel = require('../../models/policy/policy_c');
const firewallModel = require('../../models/firewall/firewall');
const fwcError = require('../../utils/error_table');

var utilsModel = require("../../utils/utils.js");

/* Create New policy_r__interface */
router.post("/",
utilsModel.disableFirewallCompileStatus,
async (req, res) => {
	//Create New objet with data policy_r__interface
	var policy_r__interfaceData = {
		rule: req.body.rule,
		interface: req.body.interface,
		position: req.body.position,
		position_order: req.body.position_order
	};

	try {
		const data = await policy_r__interfaceModel.insertPolicy_r__interface(req.body.firewall, policy_r__interfaceData);
		//If saved policy_r__interface Get data
		if (data && data.result) {
			if (data.result) {
				policy_rModel.compilePolicy_r(policy_r__interfaceData.rule, (error, datac) => {});
				res.status(200).json(data);
			} else if (!data.allowed)
				throw fwcError.NOT_ALLOWED;
			else
				throw fwcError.NOT_FOUND;
			} else throw fwcError.NOT_ALLOWED;
		} catch(error) { res.status(400).json(error) }
	});


/* Update POSITION policy_r__interface that exist */
router.put('/move',
utilsModel.disableFirewallCompileStatus,
async(req, res) => {
	var rule = req.body.rule;
	var interface = req.body.interface;
	var position = req.body.position;
	var position_order = req.body.position_order;
	var new_rule = req.body.new_rule;
	var new_position = req.body.new_position;
	var new_order = req.body.new_order;
	var firewall = req.body.firewall;

	var content1 = 'O', content2 = 'O';

	try {
		// Invalidate compilation of the affected rules.
		await policy_cModel.deletePolicy_c(rule);
		await policy_cModel.deletePolicy_c(new_rule);
		await firewallModel.updateFirewallStatus(req.body.fwcloud,firewall,"|3");

		// Get positions content.
		const data = await 	policy_r__ipobjModel.getPositionsContent(req.dbCon, position, new_position);
		content1 = data.content1;
		content2 = data.content2;	
	} catch(error) { return res.status(400).json(error) }

	if (content1 === content2) { //SAME POSITION
		policy_r__interfaceModel.updatePolicy_r__interface_position(firewall, rule, interface, position, position_order, new_rule, new_position, new_order, async (error, data) => {
			//If saved policy_r__ipobj saved ok, get data
			if (data) {
				if (data.result) {
					policy_rModel.compilePolicy_r(rule, function(error, datac) {});
					policy_rModel.compilePolicy_r(new_rule, function(error, datac) {});

					// If after the move we have empty rule positions, then remove them from the negate position list.
					try {
						await policy_rModel.allowEmptyRulePositions(req);
					} catch(error) { return res.status(400).json(error) }

					res.status(200).json(data);
				} else if (!data.allowed) {
					return res.status(400).json(fwcError.NOT_ALLOWED);
				} else return res.status(400).json(fwcError.NOT_FOUND);
			} else return res.status(400).json(error);
		});
	} else { //DIFFERENTS POSITIONS
		if (content1 === 'O' && content2 === 'I') {
			//Create New Position 'I'
			//Create New objet with data policy_r__interface
			var policy_r__interfaceData = {
				rule: new_rule,
				interface: interface,
				position: new_position,
				position_order: new_order
			};

			var data;
			try {
				data = await policy_r__interfaceModel.insertPolicy_r__interface(firewall, policy_r__interfaceData);
			} catch(error) { return res.status(400).json(error) }
			//If saved policy_r__interface Get data
			if (data) {
				if (data.result) {
					//delete Position 'O'
					policy_r__ipobjModel.deletePolicy_r__ipobj(rule, -1, -1, interface, position, position_order, async (error, data) => {
						if (data && data.result) {
							policy_rModel.compilePolicy_r(rule, function(error, datac) {});
							policy_rModel.compilePolicy_r(new_rule, function(error, datac) {});

							// If after the move we have empty rule positions, then remove them from the negate position list.
							try {
								await policy_rModel.allowEmptyRulePositions(req);
							} catch(error) { return res.status(400).json(error) }

							res.status(200).json(data);
						} else return res.status(400).json(error);
					});
				} else if (!data.allowed) {
					return res.status(400).json(fwcError.NOT_ALLOWED);
				} else return res.status(400).json(fwcError.NOT_FOUND);
			} else return res.status(400).json(error);
		}
	}
});


/* Update ORDER de policy_r__interface that exist */
router.put('/order',
utilsModel.disableFirewallCompileStatus,
(req, res) => {
	var rule = req.body.rule;
	var interface = req.body.interface;
	var position = req.body.position;
	var old_order = req.body.position_order;
	var new_order = req.body.new_order;

	policy_r__interfaceModel.updatePolicy_r__interface_order(rule, interface, position, old_order, new_order, function(error, data) {
		if (error) return res.status(400).json(error);
		//If saved policy_r__interface saved ok, get data
		if (data && data.result) {
			policy_rModel.compilePolicy_r(rule, function(error, datac) {});
			res.status(200).json(data);
		} else res.status(400).json(error);
	});
});


/* Remove policy_r__interface */
router.put("/del",
utilsModel.disableFirewallCompileStatus,
(req, res) => {
	//Id from policy_r__interface to remove
	var rule = req.body.rule;
	var interface = req.body.interface;
	var position = req.body.position;
	var old_order = req.body.position_order;

	policy_r__interfaceModel.deletePolicy_r__interface(rule, interface, position, old_order, async (error, data) => {
		if (data) {
			if (data.msg === "deleted") {
				policy_rModel.compilePolicy_r(rule, function(error, datac) {});

				// If after the delete we have empty rule positions, then remove them from the negate position list.
				try {
					await policy_rModel.allowEmptyRulePositions(req);
				} catch(error) { return res.status(400).json(error) }

				res.status(200).json(data);
			} else if (data.msg === "notExist") res.status(400).json(fwcError.NOT_FOUND);
			else res.status(400).json(error);
		} else res.status(400).json(error);
	});
});

module.exports = router;