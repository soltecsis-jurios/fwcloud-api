//create object
var openvpnPrefixModel = {};

const fwcTreeModel = require('../../../models/tree/tree');
const openvpnModel = require('../../../models/vpn/openvpn/openvpn');

// Validate new prefix container.
openvpnPrefixModel.existsPrefix = req => {
	return new Promise((resolve, reject) => {
    req.dbCon.query(`SELECT id FROM openvpn_prefix WHERE openvpn=${req.body.openvpn} AND name=${req.dbCon.escape(req.body.name)}`, (error, result) => {
      if (error) return reject(error);
      resolve((result.length>0) ? true : false);
    });
  });
};

// Add new prefix container.
openvpnPrefixModel.createPrefix = req => {
	return new Promise((resolve, reject) => {
    const prefixData = {
      id: null,
      name: req.body.name,
      openvpn: req.body.openvpn
    };
    req.dbCon.query(`INSERT INTO openvpn_prefix SET ?`, prefixData, (error, result) => {
      if (error) return reject(error);
      resolve();
    });
  });
};


// Modify a CRT Prefix container.
openvpnPrefixModel.modifyCrtPrefix = req => {
	return new Promise((resolve, reject) => {
    req.dbCon.query(`UPDATE openvpn_prefix SET name=${req.dbCon.escape(req.body.name)} WHERE id=${req.body.prefix}`, (error, result) => {
      if (error) return reject(error);
      resolve();
    });
  });
};

// Delete CRT Prefix container.
openvpnPrefixModel.deleteCrtPrefix = req => {
	return new Promise((resolve, reject) => {
    req.dbCon.query(`DELETE from openvpn_prefix WHERE id=${req.body.prefix}`, (error, result) => {
      if (error) return reject(error);
      resolve();
    });
  });
};


// Get all prefixes for the indicated CA.
openvpnPrefixModel.getPrefixes = (dbCon,openvpn) => {
	return new Promise((resolve, reject) => {
    dbCon.query(`SELECT id,name FROM openvpn_prefix WHERE openvpn=${openvpn}`, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

// Get information about a prefix used in an OpenVPN configuration.
openvpnPrefixModel.getPrefixOpenvpnInfo = (dbCon, fwcloud, rule, prefix, openvpn) => {
	return new Promise((resolve, reject) => {
    let sql = `select CA.fwcloud,P.*,PRE.name,CA.cn from policy_r__openvpn_prefix_openvpn P
      inner join prefix PRE on PRE.id=P.prefix 
      inner join ca CA on CA.id=PRE.ca
      where CA.fwcloud=${fwcloud} and P.rule=${rule} and P.prefix=${prefix} and P.openvpn=${openvpn}`;
    dbCon.query(sql, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

// Fill prefix node with matching entries.
openvpnPrefixModel.fillPrefixNodeOpenVPN = (dbCon,fwcloud,openvpn_ser,prefix_name,prefix_id,parent) => {
	return new Promise((resolve, reject) => {
    // Move all affected nodes into the new prefix container node.
    const prefix = dbCon.escape(prefix_name).slice(1,-1);
    let sql =`SELECT VPN.id,SUBSTRING(cn,${prefix.length+1},255) as sufix FROM crt CRT
      INNER JOIN openvpn VPN on VPN.crt=CRT.id
      WHERE VPN.openvpn=${openvpn_ser} AND CRT.type=1 AND CRT.cn LIKE '${prefix}%'`;
    dbCon.query(sql, async (error, result) => {
      if (error) return reject(error);

      if (result.length === 0) return resolve(); // If no prefix match then do nothing.

      try {
        // Create the prefix and OpenVPN client configuration nodes.
        let node_id = await fwcTreeModel.newNode(dbCon,fwcloud,prefix_name,parent,'PRE',prefix_id,400);
        for (let row of result)
          await fwcTreeModel.newNode(dbCon,fwcloud,row.sufix,node_id,'OCL',row.id,311);
      } catch(error) { return reject(error) }

      // Remove from OpenVPN server node the nodes that match de prefix.
      sql = `DELETE FROM fwc_tree WHERE id_parent=${parent} AND obj_type=311 AND name LIKE '${prefix}%'`;
      dbCon.query(sql, (error, result) => {
        if (error) return reject(error);
        resolve();
      });
    });
  });
};



// Apply OpenVPN server prefixes to tree node.
openvpnPrefixModel.applyOpenVPNPrefixes = (dbCon,fwcloud,openvpn_srv) => {
	return new Promise(async (resolve, reject) => {
    try {
      let node = await fwcTreeModel.getNodeInfo(dbCon,fwcloud,'OSR',openvpn_srv);
      let node_id = node[0].id;
      // Remove all nodes under the OpenVPN server configuration node.
      await fwcTreeModel.deleteNodesUnderMe(dbCon,fwcloud,node_id);

      // Create all OpenVPN client config nodes.
      let openvpn_cli_list = await openvpnModel.getOpenvpnClients(dbCon,openvpn_srv);
      for (let openvpn_cli of openvpn_cli_list)
        await fwcTreeModel.newNode(dbCon,fwcloud,openvpn_cli.cn,node_id,'OCL',openvpn_cli.id,311);

      // Create the nodes for all not empty prefixes.
      const prefix_list = await openvpnPrefixModel.getPrefixes(dbCon,openvpn_srv);
      for (let prefix of prefix_list)
        await openvpnPrefixModel.fillPrefixNodeOpenVPN(dbCon,fwcloud,openvpn_srv,prefix.name,prefix.id,node_id);

      resolve();
    } catch(error) { return reject(error) }
  });
};


openvpnPrefixModel.searchCRTInOpenvpn = (dbCon,fwcloud,crt) => {
	return new Promise((resolve, reject) => {
    let sql = `SELECT VPN.id FROM openvpn VPN
      INNER JOIN crt CRT ON CRT.id=VPN.crt
      INNER JOIN ca CA ON CA.id=CRT.ca
      WHERE CA.fwcloud=${fwcloud} AND CRT.id=${crt}`;
    dbCon.query(sql, async (error, result) => {
      if (error) return reject(error);

      if (result.length > 0)
        resolve({result: true, restrictions: { crtUsedInOpenvpn: true}});
      else
        resolve({result: false});
    });
  });
};

openvpnPrefixModel.addPrefixToGroup = req => {
	return new Promise((resolve, reject) => {
    const data = {
      prefix: req.body.ipobj,
      openvpn: req.body.openvpn,
      ipobj_g: req.body.ipobj_g
    }
		req.dbCon.query(`INSERT INTO openvpn_prefix__ipobj_g SET ?`,data,(error, result) => {
      if (error) return reject(error);
      resolve(result.insertId);
    });
  });
};

openvpnPrefixModel.removePrefixFromGroup = req => {
	return new Promise((resolve, reject) => {
    let sql = `DELETE FROM openvpn_prefix__ipobj_g 
      WHERE prefix=${req.body.ipobj} AND openvpn=${req.body.openvpn} AND ipobj_g=${req.body.ipobj_g}`;		
		req.dbCon.query(sql,(error, result) => {
      if (error) return reject(error);
      resolve(result.insertId);
    });
  });
};



//Export the object
module.exports = openvpnPrefixModel;
