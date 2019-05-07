var express = require('express');
var router = express.Router();

const fwcTreeRepairModel = require('../../models/tree/repair');
const socketTools = require('../../utils/socket');
const fwcTreemodel = require('../../models/tree/tree');
const openvpnModel = require('../../models/vpn/openvpn/openvpn');
const openvpnPrefixModel = require('../../models/vpn/openvpn/prefix');
const fwcError = require('../../utils/error_table');


/* Rpair tree */
router.put('/', async (req, res) =>{
  socketTools.init(req); // Init the socket used for message notification by the socketTools module.
    
	try {
    if (req.body.type==='FDF')
      socketTools.msg('<font color="blue">REPAIRING FIREWALLS/CLUSTERS TREE FOR CLOUD WITH ID: '+req.body.fwcloud+'</font>\n');
    else if (req.body.type==='FDO')
      socketTools.msg('<font color="blue">REPAIRING OBJECTS TREE FOR CLOUD WITH ID: '+req.body.fwcloud+'</font>\n');
    else if (req.body.type==='FDS')
      socketTools.msg('<font color="blue">REPAIRING SERVICES TREE FOR CLOUD WITH ID: '+req.body.fwcloud+'</font>\n');
    else
      return api_resp.getJson(null, api_resp.ACR_ERROR, 'Invalid tree node type', objModel, null, jsonResp => res.status(200).json(jsonResp));
    
    await fwcTreeRepairModel.initData(req);

    socketTools.msg('<font color="blue">REPAIRING TREE FOR CLOUD WITH ID: '+req.body.fwcloud+'</font>\n');

    const rootNodes = await fwcTreeRepairModel.checkRootNodes();

    // Verify that all tree not root nodes are part of a tree.
    socketTools.msg('<font color="blue">Checking tree struture.</font>\n');
    await fwcTreeRepairModel.checkNotRootNodes(rootNodes);

    for (let rootNode of rootNodes) {
      if (rootNode.node_type==='FDF' && req.body.type==='FDF') { // Firewalls and clusters tree.
        socketTools.msg('<font color="blue">Checking folders.</font>\n');
        await fwcTreeRepairModel.checkFirewallsFoldersContent(rootNode);
        socketTools.msg('<font color="blue">Checking firewalls and clusters tree.</font>\n');
        await fwcTreeRepairModel.checkFirewallsInTree(rootNode);
        await fwcTreeRepairModel.checkClustersInTree(rootNode);
        socketTools.msg('<font color="blue">Applying OpenVPN server prefixes.</font>\n');
        const openvpn_srv_list = await openvpnModel.getOpenvpnServersByCloud(req.dbCon,req.body.fwcloud);
        for (let openvpn_srv of openvpn_srv_list) {
          socketTools.msg(`OpenVPN server: ${openvpn_srv.cn}\n`);
          await openvpnPrefixModel.applyOpenVPNPrefixes(req.dbCon,req.body.fwcloud,openvpn_srv.id);
        }
        break;
      }
      else if (rootNode.node_type==='FDO' && req.body.type==='FDO') { // Objects tree.
        socketTools.msg('<font color="blue">Checking objects tree.</font>\n');
        // Remove the full tree an create it again from scratch.
        await fwcTreemodel.deleteFwc_TreeFullNode({id: rootNode.id, fwcloud: req.body.fwcloud});
        const ids = await fwcTreemodel.createObjectsTree(req);

        socketTools.msg('<font color="blue">Checking addresses objects.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObj(ids.Addresses,'OIA',5);

        socketTools.msg('<font color="blue">Checking address ranges objects.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObj(ids.AddressesRanges,'OIR',6);

        socketTools.msg('<font color="blue">Checking network objects.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObj(ids.Networks,'OIN',7);

        socketTools.msg('<font color="blue">Checking DNS objects.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObj(ids.DNS,'ONS',9);

        socketTools.msg('<font color="blue">Checking host objects.</font>\n');
        rootNode.id = ids.OBJECTS;
        await fwcTreeRepairModel.checkHostObjects(rootNode);

        socketTools.msg('<font color="blue">Checking mark objects.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObj(ids.Marks,'MRK',30);

        socketTools.msg('<font color="blue">Checking objects groups.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObjGroup(ids.Groups,'OIG',20);
        break;
      }
      else if (rootNode.node_type==='FDS' && req.body.type==='FDS') { // Services tree.
        socketTools.msg('<font color="blue">Checking services tree.</font>\n');
        // Remove the full tree an create it again from scratch.
        await fwcTreemodel.deleteFwc_TreeFullNode({id: rootNode.id, fwcloud: req.body.fwcloud});
        const ids = await fwcTreemodel.createServicesTree(req);

        socketTools.msg('<font color="blue">Checking IP services.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObj(ids.IP,'SOI',1);

        socketTools.msg('<font color="blue">Checking ICMP services.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObj(ids.ICMP,'SOM',3);

        socketTools.msg('<font color="blue">Checking TCP services.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObj(ids.TCP,'SOT',2);

        socketTools.msg('<font color="blue">Checking UDP services.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObj(ids.UDP,'SOU',4);

        socketTools.msg('<font color="blue">Checking services groups.</font>\n');
        await fwcTreeRepairModel.checkNonStdIPObjGroup(ids.Groups,'SOG',21);
        break;
      }
    }

    socketTools.msgEnd();
    api_resp.getJson(null, api_resp.ACR_OK, 'REPAIR PROCESS COMPLETED', objModel, null, jsonResp => res.status(200).json(jsonResp));
  } catch(error) { 
    socketTools.msg(`\nERROR: ${error}\n`);
		socketTools.msgEnd();
    api_resp.getJson(null, api_resp.ACR_ERROR, 'Error repairing tree', objModel, error, jsonResp => res.status(200).json(jsonResp)) 
  }
});

module.exports = router;
