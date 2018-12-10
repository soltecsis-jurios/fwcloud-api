var db = require('../../db.js');
var asyncMod = require('async');


//create object
var fwc_treeModel = {};

//Export the object
module.exports = fwc_treeModel;



var logger = require('log4js').getLogger("app");

var tableModel = "fwc_tree";
//var Node = require("tree-node");
var Tree = require('easy-tree');
var fwc_tree_node = require("./node.js");
var utilsModel = require("../../utils/utils.js");


//Get FLAT TREE by user
fwc_treeModel.getFwc_TreeUser = function (iduser, callback) {

	db.get(function (error, connection) {
		if (error)
			callback(error, null);

		var sql = 'SELECT * FROM ' + tableModel + ' WHERE  id_user=' + connection.escape(iduser) + ' ORDER BY id_parent,node_order';

		connection.query(sql, function (error, rows) {
			if (error)
				callback(error, null);
			else
				callback(null, rows);
		});
	});
};

//Get firewall node by folder
fwc_treeModel.getFwc_TreeUserFolder = function (iduser, fwcloud, foldertype, callback) {

	db.get(function (error, connection) {
		if (error)
			callback(error, null);


		var sql = 'SELECT T.*, P.order_mode FROM ' + tableModel + ' T' +
				' inner join fwcloud C on C.id=T.fwcloud ' +
				' INNER JOIN user__cloud U ON C.id=U.fwcloud ' +   
				' LEFT JOIN fwc_tree_node_types P on T.node_type=P.node_type' +
				' WHERE  T.fwcloud=' + connection.escape(fwcloud) + '  AND T.node_type=' + connection.escape(foldertype) + ' AND T.id_parent is null ' +
				' AND U.id_user=' + connection.escape(iduser) + ' AND U.allow_access=1 ' +
				' ORDER BY T.id limit 1';
		logger.debug(sql);

		connection.query(sql, function (error, rows) {
			if (error) {
				logger.error(error);
				callback(error, null);
			} else
				callback(null, rows);
		});
	});
};


//Get COMPLETE TREE by user
fwc_treeModel.getFwc_TreeUserFull = function (iduser, fwcloud, idparent, tree, objStandard, objCloud, order_mode, filter_idfirewall, AllDone) {
	db.get(function (error, connection) {
		if (error)
			callback(error, null);

		//FALTA CONTROLAR EN QUE FWCLOUD ESTA EL USUARIO
		var sqlfwcloud = "";
		if (objStandard === '1' && objCloud === '0')
			sqlfwcloud = " AND (T.fwcloud is null OR (T.id_obj is null AND T.fwcloud=" + fwcloud + ")) ";   //Only Standard objects
		else if (objStandard === '0' && objCloud === '1')
			sqlfwcloud = " AND (T.fwcloud=" + fwcloud + " OR (T.id_obj is null AND T.fwcloud=" + fwcloud + ")) ";   //Only fwcloud objects
		else
			sqlfwcloud = " AND (T.fwcloud=" + fwcloud + " OR T.fwcloud is null OR (T.id_obj is null AND T.fwcloud=" + fwcloud + ")) ";   //ALL  objects


		//logger.debug("---> DENTRO de PADRE: " + idparent + "  NODE TYPE: " + node_type + "  ORDER_MODE: " + order_mode +  "  ID_OBJ: " + tree.id + "  NAME: " + tree.text);
		
		var sqlorder= " id";
		if (order_mode===2)
				sqlorder="name";
		
		

		//Get ALL CHILDREN NODES FROM idparent
		var sql = 'SELECT T.*, P.order_mode FROM ' + tableModel + ' T ' +
				' LEFT JOIN fwc_tree_node_types P on T.node_type=P.node_type' +
				' WHERE T.id_parent=' + connection.escape(idparent) + sqlfwcloud + ' ORDER BY ' + sqlorder;
		//logger.debug(sql);
		connection.query(sql, function (error, rows) {
			if (error)
				callback(error, null);
			else {

				if (rows) {

					asyncMod.forEachSeries(rows,
							function (row, callback) {
								hasLines(row.id, function (t) {
									//logger.debug(row);
									var tree_node = new fwc_tree_node(row);
									var add_node = true;
									if (!t) {
										//Añadimos nodo hijo

										//logger.debug("--->  AÑADIENDO NODO FINAL " + row.id + " con PADRE: " + idparent);

										tree.append([], tree_node);

										callback();
									} else {
										//dig(row.tree_id, treeArray, callback);
										//FIREWALL CONTROL ACCESS
										if (row.node_type === 'FW') {
											var idfirewall = row.id_obj;
											logger.debug("DETECTED FIREWALL NODE: " + row.id + "   FIREWALL: " + idfirewall + " - " + row.name);
											utilsModel.checkFirewallAccessTree(iduser, fwcloud, idfirewall).
													then(resp => {
														add_node = resp;
														//CHECK FILTER FIREWALL
														if (filter_idfirewall != '' && filter_idfirewall != idfirewall)
															add_node = false;

														if (add_node) {
															var treeP = new Tree(tree_node);
															tree.append([], treeP);
															fwc_treeModel.getFwc_TreeUserFull(iduser, fwcloud, row.id, treeP, objStandard, objCloud, row.order_mode, filter_idfirewall, callback);
														} else {
															logger.debug("---> <<<<DESCARTING FIREWALL NODE>>>" + row.id);
															callback();
														}
													});

										} else {
											//logger.debug("--->  AÑADIENDO NODO PADRE " + row.id + " con PADRE: " + idparent);
											//logger.debug("-------> LLAMANDO A HIJO: " + row.id + "   Node Type: " + row.node_type);

											var treeP = new Tree(tree_node);
											tree.append([], treeP);
											fwc_treeModel.getFwc_TreeUserFull(iduser, fwcloud, row.id, treeP, objStandard, objCloud, row.order_mode, filter_idfirewall, callback);
										}
									}
								});
							},
							function (err) {
								if (err)
									AllDone(err, tree);
								else
									AllDone(null, tree);
							});
				} else
					AllDone(null, tree);
			}
		});

	});
};

// Remove all tree nodes with the indicated id_obj.
fwc_treeModel.deleteObjFromTree = (fwcloud, id_obj, obj_type) => {
	return new Promise((resolve, reject) => {
		db.get((error, connection) => {
			if (error) return reject(error);

			//let sqlExists = 'SELECT fwcloud,id FROM ' + tableModel + ' WHERE node_type not like "F%" AND fwcloud=' + fwcloud + ' AND id_obj=' + id_obj;        
			let sql = 'SELECT fwcloud,id FROM ' + tableModel +
				' WHERE fwcloud=' + fwcloud + ' AND id_obj=' + id_obj + ' AND obj_type=' + obj_type;
			connection.query(sql, async (error, rows) => {
				if (error) return reject(error);

				try {
					for (let node of rows)
						await fwc_treeModel.deleteFwc_TreeFullNode(node);
					resolve();
				}	catch(error) { reject(error) }
			});
		});
	});
};

//REMOVE FULL TREE FROM PARENT NODE
fwc_treeModel.deleteFwc_TreeFullNode = data => {
	return new Promise((resolve, reject) => {
		db.get((error, connection) => {
			if (error) return reject(error);

			let sql = 'SELECT * FROM ' + tableModel + ' WHERE fwcloud=' + data.fwcloud + ' AND id_parent=' + data.id;
			connection.query(sql, async (error, rows) => {
				if (error) return reject(error);

				try {
					if (rows.length > 0) {
						//logger.debug("-----> DELETING NODES UNDER PARENT: " + data.id);
						//Bucle por interfaces
						await Promise.all(rows.map(fwc_treeModel.deleteFwc_TreeFullNode));
						await fwc_treeModel.deleteFwc_Tree_node(data.fwcloud, data.id);
					} else {
						//logger.debug("NODE FINAL: TO DELETE NODE: ", data.id);
						await fwc_treeModel.deleteFwc_Tree_node(data.fwcloud, data.id);
					}
				}	catch(err) { reject(err) }

				resolve();
			});
		});
	});
};

//DELETE NODE
fwc_treeModel.deleteFwc_Tree_node = (fwcloud, id) => {
	return new Promise((resolve, reject) => {
		db.get((error, connection) => {
			if (error) return reject(error);
			
			let sql = 'DELETE FROM ' + tableModel + ' WHERE fwcloud=' + fwcloud + ' AND id=' + id;
			connection.query(sql, (error, result) => {
				if (error) return reject(error);
				resolve({"result": true, "msg": "deleted"});
			});
		});
	});
};

//Verify node info.
fwc_treeModel.verifyNodeInfo = (id, fwcloud, id_obj) => {
	return new Promise((resolve, reject) => {
		db.get((error, connection) => {
			if (error) return reject(error);
			var sql = 'select fwcloud,id_obj FROM '+tableModel+' WHERE id='+connection.escape(id);
			connection.query(sql, (error, result) => {
				if (error) return reject(error);

				(result.length===1 && fwcloud===result[0].fwcloud && id_obj===result[0].id_obj) ? resolve(true) : resolve(false);
			});
		});
	});
};

//Create new node.
fwc_treeModel.newNode = (connection,fwcloud,name,id_parent,node_type,id_obj,obj_type) => {
	return new Promise((resolve, reject) => {
		let sql = 'INSERT INTO ' + tableModel +
			' (name,id_parent,node_type,id_obj,obj_type,fwcloud)' +
			' VALUES ('+connection.escape(name)+','+id_parent+','+connection.escape(node_type)+','+id_obj+','+obj_type+','+fwcloud+')'; 
		connection.query(sql, (error, result) => {
			if (error) return reject(error);
			resolve(result.insertId);
		});
	});
};


//UPDATE ID_OBJ FOR FIREWALL CLUSTER FULL TREE FROM PARENT NODE
fwc_treeModel.updateIDOBJFwc_TreeFullNode = function (data) {
	return new Promise((resolve, reject) => {
		db.get(function (error, connection) {
			if (error) return reject(error);

			var sql = 'SELECT ' + connection.escape(data.OLDFW) +' as OLDFW, ' + connection.escape(data.NEWFW) + ' as NEWFW, T.* ' + 
				' FROM ' + tableModel + ' T ' + 
				' WHERE fwcloud = ' + connection.escape(data.fwcloud) + ' AND id_parent=' + connection.escape(data.id) + 
				' AND id_obj=' + connection.escape(data.OLDFW);
			logger.debug(sql);
			connection.query(sql, function (error, rows) {
				if (error) return reject(error);
				if (rows.length > 0) {
					logger.debug("-----> UPDATING NODES UNDER PARENT: " + data.id);
					//Bucle por interfaces
					Promise.all(rows.map(fwc_treeModel.updateIDOBJFwc_TreeFullNode))
							.then(resp => {
								//logger.debug("----------- FIN PROMISES ALL NODE PADRE: ", data.id);
								fwc_treeModel.updateIDOBJFwc_Tree_node(data.fwcloud, data.id,data.NEWFW )
										.then(resp => {
											//logger.debug("UPDATED NODE: ", data.id);
											resolve();
										})
										.catch(e => reject(e));
							})
							.catch(e => {
								reject(e);
							});
				} else {
					logger.debug("NODE FINAL: TO UPDATE NODE: ", data.id);
					resolve();
					//Node whithout children, delete node
					fwc_treeModel.updateIDOBJFwc_Tree_node(data.fwcloud, data.id,data.NEWFW)
							.then(resp => {
								logger.debug("UPDATED NODE: ", data.id);
								resolve();
							})
							.catch(e => reject(e));
				}
			});
		});
	});
};


//UPDATE NODE
fwc_treeModel.updateIDOBJFwc_Tree_node = function (fwcloud, id, idNew) {
	return new Promise((resolve, reject) => {
		db.get(function (error, connection) {
			if (error)
				reject(error);
			var sql = 'UPDATE ' + tableModel + ' SET id_obj= ' + connection.escape(idNew)  + ' WHERE node_type<>"CL" AND node_type<>"FW"  AND fwcloud = ' + connection.escape(fwcloud) + ' AND id = ' + connection.escape(id);
			logger.debug("SQL UPDATE NODE: ", sql);
			connection.query(sql, function (error, result) {
				if (error) {
					logger.debug(sql);
					logger.debug(error);
					reject(error);
				} else {
					resolve({"result": true});
				}
			});
		});
	});
};

//Get TREE by User and Parent
fwc_treeModel.getFwc_TreeUserParent = function (fwcloud, idparent, callback) {
	db.get(function (error, connection) {
		if (error)
			callback(error, null);

		var sql = 'SELECT * FROM ' + tableModel + ' WHERE fwcloud = ' + connection.escape(fwcloud) + ' AND id_parent=' + connection.escape(idparent);
		connection.query(sql, function (error, row) {
			if (error)
				callback(error, null);
			else
				callback(null, row);
		});
	});
};

fwc_treeModel.createAllTreeCloud = req => {
	return new Promise(async (resolve, reject) => {
		logger.debug("------------- CREATING FWCTREE INIT");

		// Creating root node for CA (Certification Authorities).
		try {
			await fwc_treeModel.newNode(req.dbCon,req.body.fwcloud,'CA',null,'FCA',null,null);
		} catch(error) { return reject(error) }

		fwc_treeModel.insertFwc_Tree_init(req.body.fwcloud, (error, data) => {
			if (error) return reject(error);
			//If saved fwc-tree Get data
			if (data && data.result) {
				logger.debug("------------- CREATING FWCTREE FIREWALLS");
				fwc_treeModel.insertFwc_Tree_firewalls(req.body.fwcloud, "FDF", '', (error, data) => {
					if (error) return reject(error);
					//If saved fwc-tree Get data
					if (data && data.result) {
						logger.debug("------------- CREATING FWCTREE OBJECTS");
						fwc_treeModel.insertFwc_Tree_objects(req.body.fwcloud, "FDO", (error, data)	=> {
							if (error) return reject(error);
							//If saved fwc-tree Get data
							if (data && data.result) {
								logger.debug("------------- CREATING FWCTREE SERVICES");
								fwc_treeModel.insertFwc_Tree_objects(req.body.fwcloud, "FDS", (error, data) => {
									if (error) return reject(error);
									resolve();
								});
							}
						});
					}
				});
			}
		});
	});
};


//Init TREE  from cloud
fwc_treeModel.insertFwc_Tree_init = function (fwcloud, AllDone) {
	db.get(function (error, connection) {
		if (error) return callback(error, null);

		//INSERT NODE FIREWALLS
		sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
				" VALUES (" + "'FIREWALLS',null,'FDF',null,null," + connection.escape(fwcloud) + ")";
		logger.debug(sqlinsert);
		connection.query(sqlinsert, function (error, result) {
			if (error)
				logger.debug("ERROR FDF : " + error);
		});
		//INSERT NODE OBJECTS
		sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
				" VALUES (" + "'OBJECTS',null,'FDO',null,null," + connection.escape(fwcloud) + ")";
		connection.query(sqlinsert, function (error, result) {
			if (error)
				logger.debug("ERROR FDO : " + error);
			else {
				var parent_id = result.insertId;
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'Addresses'," + parent_id + ",'OIA',null,5," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR OIA : " + error);
				});
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'Address Ranges'," + parent_id + ",'OIR',null,6," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR OIR : " + error);
				});
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'Networks'," + parent_id + ",'OIN',null,7," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR OIN : " + error);
				});
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'Hosts'," + parent_id + ",'OIH',null,8," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR OIH : " + error);
				});
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'Groups'," + parent_id + ",'OIG',null,20," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR OIG : " + error);
				});
			}
		});
		//INSERT NODE SERVICES
		sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
				" VALUES (" + "'SERVICES',null,'FDS',null,null," + connection.escape(fwcloud) + ")";
		connection.query(sqlinsert, function (error, result) {
			if (error)
				logger.debug("ERROR FDS : " + error);
			else {
				var parent_id = result.insertId;
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'IP'," + parent_id + ",'SOI',null,1," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR SOI : " + error);
				});
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'TCP'," + parent_id + ",'SOT',null,2," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR SOT : " + error);
				});
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'ICMP'," + parent_id + ",'SOM',null,3," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR SOM : " + error);
				});
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'UDP'," + parent_id + ",'SOU',null,4," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR SOU : " + error);
				});
				sqlinsert = "INSERT INTO " + tableModel + "(name, id_parent, node_type, id_obj, obj_type, fwcloud) " +
						" VALUES (" + "'Groups'," + parent_id + ",'SOG',null,21," + connection.escape(fwcloud) + ")";
				connection.query(sqlinsert, function (error, result) {
					if (error)
						logger.debug("ERROR SOG : " + error);
				});
			}
		});
		AllDone(null, {"result": true});
	});
};


//Add new TREE FIREWALLS from cloud
fwc_treeModel.insertFwc_Tree_firewalls = function (fwcloud, folder, idfirewall,AllDone) {
	db.get(function (error, connection) {
		if (error) return callback(error, null);

		let sql = "";

		if ((typeof folder) == "string") //Select Parent Node by type
			sql = 'SELECT T1.* FROM ' + tableModel + ' T1  where T1.node_type=' + connection.escape(folder) + ' and T1.id_parent is null AND T1.fwcloud=' + connection.escape(fwcloud) + ' order by T1.node_order';
		else // Select parent node by id
			sql = 'SELECT T1.* FROM ' + tableModel + ' T1  where T1.id=' + connection.escape(folder) + ' and T1.fwcloud=' + connection.escape(fwcloud) + ' order by T1.node_order';

			connection.query(sql, function (error, rows) {
			if (error) {
				AllDone(error, null);
			} else {
				//For each node Select Objects by  type
				if (rows) {
					asyncMod.forEachSeries(rows, function (row, callback) {
						//logger.debug(row);
						//logger.debug("---> DENTRO de NODO: " + row.name + " - " + row.node_type);
						var tree_node = new fwc_tree_node(row);
						//Añadimos nodos FIREWALL del CLOUD
						var sqlFirewall="";
						if (idfirewall!=='')
								sqlFirewall=" AND F.id= " +  connection.escape(idfirewall)  ;
						sqlnodes = 'SELECT  F.id,F.name,F.fwcloud, F.comment FROM firewall F inner join fwcloud C on C.id=F.fwcloud WHERE C.id=' + connection.escape(fwcloud) + sqlFirewall;
						logger.debug(sqlnodes);
						connection.query(sqlnodes, function (error, rowsnodes) {
							if (error)
								callback(error, null);
							else {
								var i = 0;
								if (rowsnodes) {
									asyncMod.forEachSeries(rowsnodes, function (rnode, callback2) {
										var idfirewall = rnode.id;
										i++;
										//Insertamos nodos Firewall
										sqlinsert = 'INSERT INTO ' + tableModel +
												' (name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
												' VALUES (' + connection.escape(rnode.name) + ',' + connection.escape(row.id) + ',"FW",' +
												connection.escape(rnode.id) + ',0,' + connection.escape(rnode.fwcloud)  + ")";
										//logger.debug(sqlinsert);
										var parent_firewall;

										connection.query(sqlinsert, function (error, result) {
											if (error) {
												logger.debug("ERROR FIREWALL INSERT : " + rnode.id + " - " + rnode.name + " -> " + error);
											} else {
												logger.debug("INSERT FIREWALL OK NODE: " + rnode.id + " - " + rnode.name + "  --> FWCTREE: " + result.insertId);
												parent_firewall = result.insertId;

												var parent_FP = 0;

												//Insertamos nodo PADRE IPv4 POLICY
												sqlinsert = 'INSERT INTO ' + tableModel + '(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
													' VALUES (' + '"IPv4 POLICY",' + parent_firewall + ',"FP",' + connection.escape(idfirewall) + ',null,' + connection.escape(rnode.fwcloud)  + ")";
												logger.debug(sqlinsert);
												connection.query(sqlinsert, function (error2, result2) {
													if (error2) {
														logger.debug("ERROR FP : " + error2);
													} else {
														parent_FP = result2.insertId;
														logger.debug("INSERT IPv4 POLICY OK NODE: " + result2.insertId);
														//Insertamos nodo POLICY IN
														sqlinsert = 'INSERT INTO ' + tableModel + '(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
															' VALUES (' + '"INPUT",' + parent_FP + ',"PI",' + connection.escape(idfirewall) + ',1,' + connection.escape(rnode.fwcloud)  + ")";
														logger.debug(sqlinsert);
														connection.query(sqlinsert, function (error, result) {
															if (error)
																logger.debug("ERROR PI : " + error);
														});
														//Insertamos nodo POLICY OUT
														sqlinsert = 'INSERT INTO ' + tableModel + '(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
															' VALUES (' + '"OUTPUT",' + parent_FP + ',"PO",' + connection.escape(idfirewall) + ',2,' + connection.escape(rnode.fwcloud)  + ")";
														logger.debug(sqlinsert);
														connection.query(sqlinsert, function (error, result) {
															if (error)
																logger.debug("ERROR PO : " + error);
														});
														//Insertamos nodo POLICY FORWARD
														sqlinsert = 'INSERT INTO ' + tableModel + '(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
															' VALUES (' + '"FORWARD",' + parent_FP + ',"PF",' + connection.escape(idfirewall) + ',3,' + connection.escape(rnode.fwcloud)  + ")";
														logger.debug(sqlinsert);
														connection.query(sqlinsert, function (error, result) {
															if (error)
																logger.debug("ERROR PF: " + error);
														});
														//Insertamos nodo SNAT
														sqlinsert = 'INSERT INTO ' + tableModel + '(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
															' VALUES (' + '"SNAT",' + parent_FP + ',"NTS",' + connection.escape(idfirewall) + ',4,' + connection.escape(rnode.fwcloud)  + ")";
														logger.debug(sqlinsert);
														connection.query(sqlinsert, function (error, result) {
															if (error)
																logger.debug("ERROR SNAT: " + error);
														});
														//Insertamos nodo DNAT
														sqlinsert = 'INSERT INTO ' + tableModel + '(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
															' VALUES (' + '"DNAT",' + parent_FP + ',"NTD",' + connection.escape(idfirewall) + ',5,' + connection.escape(rnode.fwcloud)  + ")";
														logger.debug(sqlinsert);
														connection.query(sqlinsert, function (error, result) {
															if (error)
																logger.debug("ERROR DNAT: " + error);
														});
													}
												});

												//Insertamos nodo ROUTING
												sqlinsert = 'INSERT INTO ' + tableModel + '(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
													' VALUES (' + '"Routing",' + parent_firewall + ',"RR",' + connection.escape(idfirewall) + ',6,' + connection.escape(rnode.fwcloud)  + ")";
												connection.query(sqlinsert, function (error, result) {
													if (error)
														logger.debug("ERROR RR : " + error);
												});

												var nodeInterfaces;
												//Insertamos nodo INTERFACES FIREWALL
												sqlinsert = 'INSERT INTO ' + tableModel + '(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
													' VALUES (' + '"Interfaces",' + parent_firewall + ',"FDI",' + connection.escape(idfirewall) + ',10,' + connection.escape(rnode.fwcloud)  + ")";
												connection.query(sqlinsert, function (error, result) {
													if (error)
														logger.debug("ERROR FDI: " + error);
													else
														nodeInterfaces = result.insertId;
												});

												//Insertamos nodos hijos Interface
												sqlInt = 'SELECT  id,name,labelName FROM interface where interface_type=10 AND  firewall=' + connection.escape(idfirewall);
												connection.query(sqlInt, function (error, rowsnodesInt) {
													if (error) {
														logger.debug("Error Select interface");
														callback2(error, null);
													} else {
														var j = 0;
														if (rowsnodesInt) {
															//logger.debug("INTERFACES: " + rowsnodesInt.length);
															asyncMod.forEachSeries(rowsnodesInt, function (rnodeInt, callback3) {
																j++;
																//Insertamos nodos Interfaces
																sqlinsert = 'INSERT INTO ' + tableModel +
																		'(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
																		' VALUES (' +	connection.escape(rnodeInt.name+((rnodeInt.labelName) ? " ["+rnodeInt.labelName+"]": "")) + ',' +
																		connection.escape(nodeInterfaces) + ',"IFF",' +
																		connection.escape(rnodeInt.id) + ',10,' + connection.escape(rnode.fwcloud) + ")";

																connection.query(sqlinsert, function (error, result) {
																	var idinterface;
																	if (error) {
																		logger.debug("ERROR INTERFACE INSERT : " + rnodeInt.id + " - " + rnodeInt.name + " -> " + error);
																	} else {
																		//logger.debug("INSERT INTERFACE OK NODE: " + rnodeInt.id + " - " + rnodeInt.name);
																		idinterface = result.insertId;
																	}
																	//Insertamos objetos IP de Interface
																	//Insertamos nodos Interface
																	sqlnodesIP = 'SELECT  O.id,O.name,O.type,O.fwcloud, O.comment, T.node_type FROM ipobj O inner join fwc_tree_node_types T on  T.obj_type=O.type where O.interface=' + connection.escape(rnodeInt.id);
																	//logger.debug(sqlnodesIP);
																	connection.query(sqlnodesIP, function (error, rowsnodesIP) {
																		if (error) {
																			logger.debug(error);
																		} else {
																			var k = 0;
																			if (rowsnodesIP) {
																				//logger.debug("OBJS IP: " + rowsnodesIP.length);
																				asyncMod.forEachSeries(rowsnodesIP, function (rnodeIP, callback4) {
																					k++;
																					//Insertamos nodos IP
																					sqlinsert = 'INSERT INTO ' + tableModel +
																							'(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
																							' VALUES (' + connection.escape(rnodeIP.name) + ',' +
																							connection.escape(idinterface) + ',' +
																							connection.escape(rnodeIP.node_type) + ',' +
																							connection.escape(rnodeIP.id) + ',5,' +
																							connection.escape(rnode.fwcloud)  + ")";
																					connection.query(sqlinsert, function (error, result) {
																						if (error) {
																							logger.debug("ERROR IP OBJECT INSERT : " + rnodeIP.id + " - " + rnodeIP.name + " -> " + error);
																						} else {
																							//logger.debug("INSERT IPOBJ OK NODE: " + rnodeIP.id + " - " + rnodeIP.name);
																						}
																					});
																					callback4();
																				}
																				);
																			}

																		}
																	});
																});
																callback3();
															}
															);
														}

													}
													
												});



											}

										});
										callback2();
									}
									);
								}
							}
						});
						callback();
					},
							function (err) {
								if (err)
									AllDone(err, null);
								else
									AllDone(null, {"result": true});
							});
				} else
					AllDone(null, {"result": true});
			}
		});

	});

};


//Generate the IPs nodes for each interface.
fwc_treeModel.interfacesIpTree = (connection, fwcloud, nodeId, ifId) => {
	return new Promise((resolve, reject) => {
		// Get interface IPs.  
		let sql = 'SELECT O.id,O.name,O.type,T.node_type FROM ipobj O' +
			' INNER JOIN fwc_tree_node_types T on T.obj_type=O.type' +
			' WHERE O.interface=' + connection.escape(ifId);
		connection.query(sql, async (error, ips) => {
			if (error) return reject(error);
			if (ips.length===0) resolve();

			try {
				for(let ip of ips)
					await fwc_treeModel.newNode(connection,fwcloud,ip.name,nodeId,ip.node_type,ip.id,ip.type);
			} catch(error) { return reject(error) }
			resolve();
		});
	});
};

//Generate the interfaces nodes.
fwc_treeModel.interfacesTree = (connection, fwcloud, nodeId, ownerId, ownerType) => {
	return new Promise((resolve, reject) => {
		// Get firewall interfaces.  
		let sql = '';
		let oby_type;
		
		if (ownerType==='FW') {
			sql = 'SELECT id,name,labelName FROM interface' +
				' WHERE firewall=' + connection.escape(ownerId) + ' AND interface_type=10';
			obj_type=10;
		}
		else if (ownerType==='HOST') {
			sql = 'SELECT I.id,I.name,I.labelName FROM interface I' +
				' INNER JOIN interface__ipobj IO on IO.interface=I.id ' +
				' WHERE IO.ipobj=' + connection.escape(ownerId) + ' AND I.interface_type=11';
			obj_type=11;
		}
		else return reject(new Error('Invalid owner type'));

		connection.query(sql, async (error, interfaces) => {
			if (error) return reject(error);
			if (interfaces.length===0) resolve();

			try {
				for(let interface of interfaces) {
					let id = await fwc_treeModel.newNode(connection,fwcloud,interface.name+(interface.labelName ? ' ['+interface.labelName+']' : ''),nodeId,'IFF',interface.id,obj_type);
					await fwc_treeModel.interfacesIpTree(connection,fwcloud,id,interface.id);
				}
			} catch(error) { return reject(error )}
			resolve();
		});
	});
};

//Add new TREE FIREWALL for a New Firewall
fwc_treeModel.insertFwc_Tree_New_firewall = (fwcloud, nodeId, firewallId) => {
	return new Promise((resolve, reject) => {
		db.get((error, connection) => {
			if (error) return reject(error);

			// Obtain cluster data required for tree nodes creation.
			let sql = 'SELECT name FROM firewall' +
				' WHERE id=' + firewallId + ' AND fwcloud=' + fwcloud;
			connection.query(sql, async (error, firewalls) => {
				if (error) return reject(error);
				if (firewalls.length!==1) return reject(new Error('Firewall with id '+firewallId+' not found'));

				try {
					// Create root firewall node
					let id1 = await fwc_treeModel.newNode(connection,fwcloud,firewalls[0].name,nodeId,'FW',firewallId,0);
					
					let id2 = await fwc_treeModel.newNode(connection,fwcloud,'IPv4 POLICY',id1,'FP',firewallId,0);
					await fwc_treeModel.newNode(connection,fwcloud,'INPUT',id2,'PI',firewallId,1);
					await fwc_treeModel.newNode(connection,fwcloud,'OUTPUT',id2,'PO',firewallId,2);
					await fwc_treeModel.newNode(connection,fwcloud,'FORWARD',id2,'PF',firewallId,3);
					await fwc_treeModel.newNode(connection,fwcloud,'SNAT',id2,'NTS',firewallId,4);
					await fwc_treeModel.newNode(connection,fwcloud,'DNAT',id2,'NTD',firewallId,5);
					
					id2 = await fwc_treeModel.newNode(connection,fwcloud,'Interfaces',id1,'FDI',firewallId,10);
					await fwc_treeModel.interfacesTree(connection,fwcloud,id2,firewallId,'FW');

					await fwc_treeModel.newNode(connection,fwcloud,'OpenVPN',id1,'OPN',firewallId,0);					
					await fwc_treeModel.newNode(connection,fwcloud,'Routing',id1,'RR',firewallId,6);					
				} catch(error) { return reject(error) }
				resolve();
			});
		});
	});
};

// Create a new node for the new firewall into the NODES node of the cluster tree.
fwc_treeModel.insertFwc_Tree_New_cluster_firewall = (fwcloud, clusterId, firewallId, firewallName) => {
	return new Promise((resolve, reject) => {
		db.get((error, connection) => {
			if (error) return reject(error);

			sql ='SELECT id FROM fwc_tree WHERE id_obj=' +
				'(select id from firewall where cluster=' + connection.escape(clusterId) + ' and fwmaster=1)' +
				' AND fwcloud=' + connection.escape(fwcloud) + ' AND node_type="FCF"';
			connection.query(sql, async (error, nodes) => {
				if (error) return reject(error);
				if (nodes.length!==1) return reject(new Error('Node NODES not found'));

				await fwc_treeModel.newNode(connection,fwcloud,firewallName,nodes[0].id,'FW',firewallId,0);
				resolve();
			});
		});
	});
};

//Add new TREE CLUSTER for a New CLuster
fwc_treeModel.insertFwc_Tree_New_cluster = (fwcloud, nodeId, clusterId) => {
	return new Promise((resolve, reject) => {
		db.get((error, connection) => {
			if (error) return reject(error);

			// Obtain cluster data required for tree nodes creation.
			let sql = 'SELECT C.id,C.name,F.id as fwmaster_id FROM cluster C' +
				' INNER JOIN firewall F on F.cluster=C.id ' +
				' WHERE C.id=' + clusterId + ' AND C.fwcloud=' + fwcloud + ' AND F.fwmaster=1';
			connection.query(sql, async (error, clusters) => {
				if (error) return reject(error);
				if (clusters.length!==1) return reject(new Error('Cluster with id '+clusterId+' not found'));

				try {
					// Create root cluster node
					let id1 = await fwc_treeModel.newNode(connection,fwcloud,clusters[0].name,nodeId,'CL',clusters[0].id,100);
					
					let id2 = await fwc_treeModel.newNode(connection,fwcloud,'IPv4 POLICY',id1,'FP',clusters[0].fwmaster_id,100);
					await fwc_treeModel.newNode(connection,fwcloud,'INPUT',id2,'PI',clusters[0].fwmaster_id,1);
					await fwc_treeModel.newNode(connection,fwcloud,'OUTPUT',id2,'PO',clusters[0].fwmaster_id,2);
					await fwc_treeModel.newNode(connection,fwcloud,'FORWARD',id2,'PF',clusters[0].fwmaster_id,3);
					await fwc_treeModel.newNode(connection,fwcloud,'SNAT',id2,'NTS',clusters[0].fwmaster_id,4);
					await fwc_treeModel.newNode(connection,fwcloud,'DNAT',id2,'NTD',clusters[0].fwmaster_id,5);
					
					id2 = await fwc_treeModel.newNode(connection,fwcloud,'Interfaces',id1,'FDI',clusters[0].fwmaster_id,10);
					await fwc_treeModel.interfacesTree(connection,fwcloud,id2,clusters[0].fwmaster_id,'FW');

					await fwc_treeModel.newNode(connection,fwcloud,'OpenVPN',id1,'OPN',clusters[0].fwmaster_id,0);					
					await fwc_treeModel.newNode(connection,fwcloud,'Routing',id1,'RR',clusters[0].fwmaster_id,6);					

					id2 = await fwc_treeModel.newNode(connection,fwcloud,'NODES',id1,'FCF',clusters[0].fwmaster_id,null);

					// Create the nodes for the cluster firewalls.
					sql ='SELECT id,name FROM firewall WHERE cluster=' + clusterId + ' AND fwcloud=' + fwcloud;
					connection.query(sql, async (error, firewalls) => {
						if (error) return reject(error);
						if (firewalls.length===0) return reject(new Error('No firewalls found for cluster with id '+clusters[0].id));

						for(let firewall of firewalls) 
							await fwc_treeModel.newNode(connection,fwcloud,firewall.name,id2,'FW',firewall.id,0);

						resolve();
					});
				} catch(error) { return reject(error)}
			});
		});
	});
};

//CONVERT TREE FIREWALL TO CLUSTER for a New CLuster
fwc_treeModel.updateFwc_Tree_convert_firewall_cluster = (fwcloud, node_id, idcluster, idfirewall, AllDone) => {
	db.get(function (error, connection) {
		if (error) return	callback(error, null);

		getFirewallNodeId(idfirewall, function (datafw) {
			var firewallNode = datafw;

			//Select Parent Node by id   
			sql = 'SELECT T1.* FROM ' + tableModel + ' T1  where T1.id=' + connection.escape(node_id) + ' AND T1.fwcloud=' + connection.escape(fwcloud) + ' order by T1.node_order';
			logger.debug(sql);
			connection.query(sql, function (error, rows) {
				if (error) return AllDone(error, null);

				if (rows[0].node_type!='FDF' && rows[0].node_type!='FD') 
					return AllDone(new Error('Bad folder type'), null);

				//For each node Select Objects by  type
				if (rows) {
					asyncMod.forEachSeries(rows, function (row, callback) {
						//logger.debug(row);
						//logger.debug("---> DENTRO de NODO: " + row.name + " - " + row.node_type);
						var tree_node = new fwc_tree_node(row);
						//Añadimos nodos CLUSTER del CLOUD
						sqlnodes = 'SELECT id,name,fwcloud FROM cluster WHERE id=' + connection.escape(idcluster);
						//logger.debug(sqlnodes);
						connection.query(sqlnodes, function (error, rowsnodes) {
							if (error)
								callback(error, null);
							else {
								var i = 0;
								if (rowsnodes) {
									asyncMod.forEachSeries(rowsnodes, function (rnode, callback2) {
										i++;
										//Insertamos nodos Cluster
										sqlinsert = 'INSERT INTO ' + tableModel +
												' (name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
												' VALUES (' + connection.escape(rnode.name) + ',' +
												connection.escape(row.id) + ',"CL",' +
												connection.escape(rnode.id) + ',100,' +
												connection.escape(fwcloud)  + ")";
										//logger.debug(sqlinsert);
										var parent_cluster;

										connection.query(sqlinsert, function (error, result) {
											if (error) {
												logger.debug("ERROR CLUSTER INSERT : " + rnode.id + " - " + rnode.name + " -> " + error);
											} else {
												logger.debug("INSERT CLUSTER OK NODE: " + rnode.id + " - " + rnode.name + "  --> FWCTREE: " + result.insertId);
												parent_cluster = result.insertId;

												var parent_FP = 0;

												//update ALL FIREWALL NODES
												sqlinsert = 'UPDATE ' + tableModel + ' SET id_parent=' + parent_cluster +
														' WHERE id_parent=' + firewallNode;
												logger.debug(sqlinsert);
												connection.query(sqlinsert, function (error, result) {
													if (error)
														logger.debug("ERROR ALL NODES : " + error);
												});

											}



											//Insertamos nodo NODE FIREWALLS
											sqlinsert = 'INSERT INTO ' + tableModel + '(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
												' VALUES (' + '"NODES",' + parent_cluster + ',"FCF",' + connection.escape(idfirewall) + ',null,' + connection.escape(rnode.fwcloud) + ")";
											connection.query(sqlinsert, function (error, result) {
												if (error)
													logger.debug("ERROR RR : " + error);
												else {
													var nodes_cluster = result.insertId;
													//update  FIREWALL NODE
													sqlinsert = 'UPDATE ' + tableModel + ' SET id_parent=' + nodes_cluster +
															' WHERE id=' + firewallNode;
													logger.debug(sqlinsert);
													connection.query(sqlinsert, function (error, result) {
														if (error)
															logger.debug("ERROR FIREWALL NODE : " + error);
													});
												}
											});


										});
										callback2();
									}
									);
								}
							}
						});
						callback();
					},
							function (err) {
								if (err)
									AllDone(err, null);
								else
									AllDone(null, {"result": true});
							});
				} else
					AllDone(null, {"result": true});
			});

		});
	});

};

//CONVERT TREE CLUSTER TO FIREWALL for a New Firewall
fwc_treeModel.updateFwc_Tree_convert_cluster_firewall = (fwcloud, node_id, idcluster, idfirewall, AllDone) => {
	db.get(function (error, connection) {
		if (error) return callback(error, null);

		getFirewallNodeId(idfirewall, datafw => {
			var firewallNode = datafw;
			//Select Parent Node CLUSTERS 
			sql = 'SELECT T1.* FROM ' + tableModel + ' T1  where T1.id=' + connection.escape(node_id) + ' AND T1.fwcloud=' + connection.escape(fwcloud) + ' order by T1.node_order';

			connection.query(sql, (error, rows) => {
				if (error) return AllDone(error, null);

				if (rows[0].node_type!='FDF' && rows[0].node_type!='FD') 
					return AllDone(new Error('Bad folder type'), null);

				//For each node Select Objects by  type
				if (rows && rows.length > 0) {
					var row = rows[0];
					//logger.debug(row);
					//logger.debug("---> DENTRO de NODO: " + row.name + " - " + row.node_type);

					//SEARCH IDNODE for CLUSTER
					sql = 'SELECT T1.* FROM ' + tableModel + ' T1  where T1.node_type="CL" and T1.id_parent=' + row.id + ' AND T1.fwcloud=' + connection.escape(fwcloud) + ' AND id_obj=' + idcluster;
					connection.query(sql, function (error, rowsCL) {
						if (error) {
							AllDone(error, null);
						} else if (rowsCL && rowsCL.length > 0) {

							var clusterNode = rowsCL[0].id;

							//update ALL NODES UNDER CLUSTER to FIREWALL
							sqlinsert = 'UPDATE ' + tableModel + ' SET id_parent=' + firewallNode +
									' WHERE id_parent=' + clusterNode + ' AND node_type<>"FCF"';
							connection.query(sqlinsert, function (error, result) {
								if (error)
									logger.debug("ERROR ALL NODES : " + error);
							});

							//SEARCH node NODES
							sql = 'SELECT T1.* FROM ' + tableModel + ' T1  where T1.node_type="FCF" and T1.id_parent=' + clusterNode + ' AND T1.fwcloud=' + connection.escape(fwcloud);
							logger.debug(sql);
							connection.query(sql, function (error, rowsN) {
								if (error) {
									AllDone(error, null);
								} else if (rowsN && rowsN.length > 0) {
									var idNodes = rowsN[0].id;
									//Remove nodo NODES
									sqldel = 'DELETE FROM  ' + tableModel + ' ' +
											' WHERE node_type= "FCF" and id_parent=' + clusterNode;
									logger.debug(sqldel);
									connection.query(sqldel, function (error, result) {
										if (error)
											logger.debug("ERROR FCF : " + error);
									});
									//SEARCH IDNODE for FIREWALLS NODE
									sql = 'SELECT T1.* FROM ' + tableModel + ' T1  where T1.node_type="FDF" and T1.id_parent is null AND T1.fwcloud=' + connection.escape(fwcloud);
									logger.debug(sql);
									connection.query(sql, function (error, rowsF) {
										var firewallsNode = rowsF[0].id;
										//update  FIREWALL under NODES to FIREWALLS NODE
										sqlinsert = 'UPDATE ' + tableModel + ' SET id_parent=' + node_id +
												' WHERE id=' + firewallNode;
										logger.debug(sqlinsert);
										connection.query(sqlinsert, function (error, result) {
											if (error)
												logger.debug("ERROR FIREWALL NODE : " + error);
											else {
												//Remove nodo Firewalls Slaves
												sqldel = 'DELETE FROM  ' + tableModel + ' ' +
														' WHERE node_type= "FW"  and id_parent=' + idNodes;
												logger.debug(sqldel);
												connection.query(sqldel, function (error, result) {
													if (error)
														logger.debug("ERROR FW - FCF : " + error);
													else {
														AllDone(null, {"result": true});
													}
												});
											}
										});
									});

								}
							});
						} else
							AllDone(error, null);
					});
				} else
					AllDone(null, {"result": true});
			});
		});
	});
};
//Add new TREE OBJECTS from user
fwc_treeModel.insertFwc_Tree_objects = function (fwcloud, folder, AllDone) {
	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		//Select Parent Node by type   
		sql = 'SELECT T1.* FROM ' + tableModel + ' T1 inner join fwc_tree T2 on T1.id_parent=T2.id where T2.node_type=' + connection.escape(folder) + ' and T2.id_parent is null AND (T1.fwcloud=' + connection.escape(fwcloud) + ' OR T1.fwcloud is null) order by T1.node_order';
		logger.debug(sql);
		connection.query(sql,
				function (error, rows) {
					if (error) {
						callback(error, null);
					} else {
						//For each node Select Objects by  type
						if (rows) {
							asyncMod.forEachSeries(rows,
									function (row, callback) {
										//logger.debug(row);
										logger.debug("---> DENTRO de NODO: " + row.name + " - Node_Type:" + row.node_type + "  Obj_type:" + row.obj_type);
										var tree_node = new fwc_tree_node(row);
										//Añadimos nodos hijos del tipo
										if (row.node_type === "OIG" || row.node_type === "SOG") {
											sqlnodes = 'SELECT  id,name,type,fwcloud, comment FROM ipobj_g  where type=' + row.obj_type + ' AND (fwcloud=' + fwcloud + ' OR fwcloud is null) ';
										} else
											sqlnodes = 'SELECT  id,name,type,fwcloud, comment FROM ipobj  where type=' + row.obj_type + ' AND interface is null' + ' AND (fwcloud=' + fwcloud + ' OR fwcloud is null) ';
										logger.debug(sqlnodes);
										connection.query(sqlnodes, function (error, rowsnodes) {
											if (error)
												callback(error, null);
											else {
												var i = 0;
												if (rowsnodes) {
													asyncMod.forEachSeries(rowsnodes,
															function (rnode, callback) {
																i++;
																//Insertamos nodo
																sqlinsert = 'INSERT INTO ' + tableModel +	'(name, id_parent, node_type, id_obj, obj_type,fwcloud) ' +
																		' VALUES (' + connection.escape(rnode.name) + ',' +
																		connection.escape(row.id) + ',' + connection.escape(row.node_type) + ',' +
																		connection.escape(rnode.id) + ',' + connection.escape(rnode.type) + ',' +
																		connection.escape(rnode.fwcloud)  + ")";
																//logger.debug(sqlinsert);
																connection.query(sqlinsert, function (error, result) {
																	if (error) {
																		logger.debug("ERROR INSERT : " + rnode.id + " - " + rnode.name + " Type: " + rnode.type + " --> " + error);
																	} else {
																		var NodeId = result.insertId;
																		logger.debug("INSERT OK NODE : " + rnode.id + " - " + rnode.name + "  Type: " + rnode.type + "  fwcloud:" + rnode.fwcloud);
																		//INSERT OBJECTS FROM GROUPS
																		if (row.node_type === "OIG" || row.node_type === "SOG") {
																			sqlinsert = 'INSERT INTO ' + tableModel +
																					'( name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
																					' SELECT O.name,' + connection.escape(NodeId) + ',' +
																					' T.node_type,O.id, O.type, O.fwcloud ' +
																					' FROM ipobj O ' +
																					' INNER JOIN ipobj__ipobjg G on O.id=G.ipobj ' +
																					' inner join fwc_tree_node_types T on T.obj_type=O.type ' +
																					' WHERE G.ipobj_g=' + rnode.id +
																					' ORDER BY G.id_gi';
																			//logger.debug(sqlinsert);
																			connection.query(sqlinsert, function (error, result) {
																				if (error) {
																					logger.debug("ERROR INSERT GROUP OBJECTS: " + rnode.id + " - " + rnode.name + " Type: " + rnode.type + " --> " + error);
																				} else {
																					//logger.debug("INSERT OK GROUP CHILD NODE Objects: " + result.affectedRows);
																				}
																			});
																		}
																		//INSERT INTERFACES FROM  HOST
																		else if (row.node_type === "OIH") {
																			sqlnodes = 'SELECT  O.id,O.name,O.interface_type, O.comment, T.node_type FROM interface O ' +
																					' inner join interface__ipobj F on F.interface=O.id ' +
																					' inner join fwc_tree_node_types T on T.obj_type=O.interface_type ' +
																					' WHERE F.ipobj=' + rnode.id;
																			connection.query(sqlnodes, function (error, rowsnodesObj) {
																				if (error)
																					logger.debug(error);
																				else {
																					var j = 0;
																					asyncMod.forEachSeries(rowsnodesObj,
																							function (rnodeObj, callback2) {
																								j++;
																								sqlinsert = 'INSERT INTO ' + tableModel +
																										'(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
																										' SELECT O.name,' + connection.escape(NodeId) + ',' +
																										' T.node_type,O.id, O.interface_type, ' + rnode.fwcloud +
																										' FROM interface O ' +
																										' inner join interface__ipobj F on F.interface=O.id ' +
																										' inner join fwc_tree_node_types T on T.obj_type=O.interface_type ' +
																										' WHERE F.ipobj=' + rnode.id + ' AND O.id=' + rnodeObj.id;
																								//logger.debug(sqlinsert);
																								connection.query(sqlinsert, function (error, result) {
																									if (error) {
																										logger.debug("ERROR INSERT HOST INTERFACES: " + rnode.id + " - " + rnode.name + " Type: " + rnode.type + " --> " + error);
																									} else {
																										idNodeinterface = result.insertId;
																										//logger.debug("INSERT OK CHILD NODE HOST: " + rnode.id + " - " + rnode.name + "  INTERFACE:" + rnodeObj.id + " - " + rnodeObj.name);
																										sqlinsertObj = 'INSERT INTO ' + tableModel +
																												'(name, id_parent, node_type, id_obj, obj_type, fwcloud) ' +
																												' SELECT O.name,' + connection.escape(idNodeinterface) + ',' +
																												' T.node_type,O.id,O.type,O.fwcloud ' +
																												' FROM ipobj O ' +
																												' inner join fwc_tree_node_types T on T.obj_type=O.type ' +
																												' WHERE  O.interface=' + rnodeObj.id;
																										//logger.debug(sqlinsertObj);
																										connection.query(sqlinsertObj, function (error, result) {
																											if (error) {
																												logger.debug("ERROR INSERT HOST INTERFACES: " + rnode.id + " - " + rnode.name + " Type: " + rnode.type + " --> " + error);
																											} else {
																												//logger.debug("INSERT OK CHILD  OBJ NODE HOST INTERFACE:" + rnodeObj.id + " - " + rnodeObj.name);

																											}
																										});
																									}
																								});
																								callback2();
																							});
																				}
																			});
																		}

																	}
																});
																callback();
															}

													);
												}
											}
										});
										callback();
									},
									function (err) {
										if (err)
											AllDone(err, null);
										else
											AllDone(null, {"result": true});
									});
						} else
							AllDone(null, {"result": true});
					}
				});
	});
};


//Add new NODE from IPOBJ or Interface
fwc_treeModel.insertFwc_TreeOBJ = function (id_user, fwcloud, node_parent, node_order, node_type, node_Data, callback) {
	var fwc_treeData = {
		id: null,
		name: node_Data.name + (((node_Data.type===10 ||node_Data.type===11) && node_Data.labelName) ? " ["+node_Data.labelName+"]": ""),
		id_parent: node_parent,
		node_type: node_type,
		obj_type: node_Data.type,
		id_obj: node_Data.id,
		fwcloud: fwcloud
	};

	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		connection.query('INSERT INTO ' + tableModel + ' SET ?', fwc_treeData, function (error, result) {
			if (error) {
				callback(error, null);
			} else {
				if (result.affectedRows > 0) {
					OrderList(node_order, fwcloud, node_parent, 999999, result.insertId);
					//devolvemos la última id insertada
					callback(null, {"insertId": result.insertId});
				} else
					callback(null, {"insertId": 0});
			}
		});
	});
};

//Update NODE from user
fwc_treeModel.updateFwc_Tree = function (nodeTreeData, callback) {

	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		var sql = 'UPDATE ' + tableModel + ' SET ' +
				' name = ' + connection.escape(nodeTreeData.name) + ' ' +
				' WHERE id = ' + nodeTreeData.id;
		connection.query(sql, function (error, result) {
			if (error) {
				callback(error, null);
			} else {
				callback(null, {"result": true});
			}
		});
	});
};

//Update NODE from FIREWALL UPDATE
fwc_treeModel.updateFwc_Tree_Firewall = function (iduser, fwcloud, FwData, callback) {
	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		var sql = 'UPDATE ' + tableModel + ' SET name =' + connection.escape(FwData.name) +
			' WHERE id_obj=' + FwData.id + ' AND fwcloud=' + fwcloud + ' AND node_type="FW"';
		connection.query(sql, function (error, result) {
			if (error) {
				logger.debug(sql);
				logger.debug(error);
				callback(error, null);
			} else {
				if (result.affectedRows > 0)
					callback(null, {"result": true});
				else
					callback(null, {"result": false});
			}
		});
	});
};

//Update NODE from CLUSTER UPDATE
fwc_treeModel.updateFwc_Tree_Cluster = function (iduser, fwcloud, Data, callback) {
	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		var sql = 'UPDATE ' + tableModel + ' SET ' +
				' name=' + connection.escape(Data.name) +
				' WHERE id_obj=' + Data.id + ' AND fwcloud=' + fwcloud + ' AND node_type="CL"';
		connection.query(sql, function (error, result) {
			if (error) {
				logger.debug(sql);
				logger.debug(error);
				callback(error, null);
			} else {
				if (result.affectedRows > 0)
					callback(null, {"result": true});
				else
					callback(null, {"result": false});
			}
		});
	});
};

//Update NODE from IPOBJ or INTERFACE UPDATE
fwc_treeModel.updateFwc_Tree_OBJ = function (iduser, fwcloud, ipobjData, callback) {
	db.get(function (error, connection) {
		if (error) return callback(error, null);
		let sql = 'UPDATE ' + tableModel + ' SET' +
			' name=' + connection.escape(ipobjData.name+(((ipobjData.type===10 ||ipobjData.type===11) && ipobjData.labelName) ? " ["+ipobjData.labelName+"]": "")) + 
			' WHERE node_type NOT LIKE "F%" AND' +
			' id_obj = ' + connection.escape(ipobjData.id) + ' AND obj_type=' + connection.escape(ipobjData.type) + ' AND fwcloud=' + connection.escape(fwcloud);
		connection.query(sql, function (error, result) {
			if (error) {
				logger.debug(sql);
				logger.debug(error);
				callback(error, null);
			} else {
				if (result.affectedRows > 0)
					callback(null, {"result": true});
				else
					callback(null, {"result": false});
			}
		});
	});
};



//Remove NODE FROM GROUP with id_obj to remove
fwc_treeModel.deleteFwc_TreeGroupChild = function (iduser, fwcloud, id_parent, id_group, id_obj, callback) {
	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		var sqlExists = 'SELECT * FROM ' + tableModel + ' T INNER JOIN ' + tableModel + ' T2 ON  T.id_parent=T2.id WHERE T.fwcloud = ' + connection.escape(fwcloud) + ' AND T.id_obj = ' + connection.escape(id_obj) + ' AND T2.id_obj = ' + connection.escape(id_group);
		connection.query(sqlExists, function (error, row) {
			//If exists Id from ipobj to remove
			if (row) {
				db.get(function (error, connection) {
					var sql = 'DELETE T.* FROM ' + tableModel + ' T INNER JOIN ' + tableModel + ' T2 ON  T.id_parent=T2.id WHERE T.fwcloud = ' + connection.escape(fwcloud) + ' AND T.id_obj = ' + connection.escape(id_obj) + ' AND T2.id_obj = ' + connection.escape(id_group);
					//logger.debug(sql);
					connection.query(sql, function (error, result) {
						if (error) {
							logger.debug(sql);
							callback(error, null);
						} else {
							callback(null, {"result": true, "msg": "deleted"});
						}
					});
				});
			} else {
				callback(null, {"result": false});
			}
		});
	});
};
function hasLines(id, callback) {
	var ret;
	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		var sql = 'SELECT * FROM  ' + tableModel + '  where id_parent = ' + id;
		connection.query(sql, function (error, rows) {
			if (rows.length > 0) {
				ret = true;
			} else {
				ret = false;
			}
			callback(ret);
		});
	});
}

function getFirewallNodeId(idfirewall, callback) {
	var ret;
	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		var sql = 'SELECT id FROM  ' + tableModel + '  where node_type="FW" AND id_obj = ' + idfirewall;
		connection.query(sql, function (error, rows) {
			if (rows.length > 0) {
				ret = rows[0].id;
			} else {
				ret = 0;
			}
			callback(ret);
		});
	});
}

function OrderList(new_order, fwcloud, id_parent, old_order, id) {
	var increment = '+1';
	var order1 = new_order;
	var order2 = old_order;
	if (new_order > old_order) {
		increment = '-1';
		order1 = old_order;
		order2 = new_order;
	}

	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		var sql = 'UPDATE ' + tableModel + ' SET ' +
				'node_order = node_order' + increment +
				' WHERE (fwcloud = ' + connection.escape(fwcloud) + ' OR fwcloud is null) ' +
				' AND id_parent=' + connection.escape(id_parent) +
				' AND node_order>=' + order1 + ' AND node_order<=' + order2 +
				' AND id<>' + connection.escape(id);
		connection.query(sql);
		//logger.debug(sql);
	});
}
//Busca todos los padres donde aparece el IPOBJ a borrar
//Ordena todos los nodos padres sin contar el nodo del IPOBJ
//Order Tree Node by IPOBJ
fwc_treeModel.orderTreeNodeDeleted = function (fwcloud, id_obj_deleted, callback) {
	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		var sqlParent = 'SELECT DISTINCT id_parent FROM ' + tableModel + ' WHERE (fwcloud=' + connection.escape(fwcloud) + ' OR fwcloud is null) AND id_obj=' + connection.escape(id_obj_deleted) + ' order by id_parent';
		logger.debug(sqlParent);
		connection.query(sqlParent, function (error, rows) {
			if (rows.length > 0) {
				var order = 0;
				asyncMod.map(rows, function (row, callback1) {
					var id_parent = row.id_parent;
					var sqlNodes = 'SELECT * FROM ' + tableModel + ' WHERE (fwcloud=' + connection.escape(fwcloud) + ' OR fwcloud is null) AND id_parent=' + connection.escape(id_parent) + ' AND id_obj<>' + connection.escape(id_obj_deleted) + ' order by id_parent, node_order';
					logger.debug(sqlNodes);
					connection.query(sqlNodes, function (error, rowsnodes) {
						if (rowsnodes.length > 0) {
							var order = 0;
							asyncMod.map(rowsnodes, function (rowNode, callback2) {
								order++;
								sql = 'UPDATE ' + tableModel + ' SET node_order=' + order +
										' WHERE id_parent = ' + connection.escape(id_parent) + ' AND id=' + connection.escape(rowNode.id);
								connection.query(sql, function (error, result) {
									if (error) {
										callback2();
									} else {
										callback2();
									}
								});
							}, //Fin de bucle
									function (err) {
										callback(null, {"result": true});
									}
							);
						} else callback1();
					});
				}, //Fin de bucle
						function (err) {
							callback(null, {"result": true});
						}

				);
			} else {
				callback(null, {"result": false});
			}
		});
	});
};
//Order Tree Node by IPOBJ
fwc_treeModel.orderTreeNode = function (fwcloud, id_parent, callback) {
	db.get(function (error, connection) {
		if (error)
			callback(error, null);
		var sqlNodes = 'SELECT * FROM ' + tableModel + ' WHERE (fwcloud=' + connection.escape(fwcloud) + ' OR fwcloud is null) AND id_parent=' + connection.escape(id_parent) + '  order by node_order';
		logger.debug(sqlNodes);
		connection.query(sqlNodes, function (error, rowsnodes) {
			if (rowsnodes.length > 0) {
				var order = 0;
				asyncMod.map(rowsnodes, function (rowNode, callback2) {
					order++;
					sql = 'UPDATE ' + tableModel + ' SET node_order=' + order +
							' WHERE id_parent = ' + connection.escape(id_parent) + ' AND id=' + connection.escape(rowNode.id);
					logger.debug(sql);
					connection.query(sql, function (error, result) {
						if (error) {
							callback2();
						} else {
							callback2();
						}
					});
				}, //Fin de bucle
						function (err) {
							callback(null, {"result": true});
						}
				);
			} else
				callback(null, {"result": true});
		});
	});
};
