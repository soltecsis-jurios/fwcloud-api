/**
 * Module to routing OpenVPN requests
 * <br>BASE ROUTE CALL: <b>/vpn/openvpn</b>
 *
 * @module OpenVPN
 * 
 * @requires express
 * @requires openvpnModel
 * 
 */

/**
 * Property  to manage express
 *
 * @property express
 * @type express
 */
var express = require('express');
/**
 * Property  to manage  route
 *
 * @property router
 * @type express.Router 
 */
var router = express.Router();


/**
 * Property Model to manage API RESPONSE data
 *
 * @property api_resp
 * @type ../../models/api_response
 * 
 */
var api_resp = require('../../utils/api_response');

/**
 * Property to identify Data Object
 *
 * @property objModel
 * @type text
 */
var objModel = 'OpenVPN';

/**
 * Property Model to manage OpenVPN Data
 *
 * @property ClusterModel
 * @type ../../models/vpn/openvpn
 */
var openvpnModel = require('../../models/vpn/openvpn');


/**
 * Create a new OpenVPN configuration in firewall.
 */
router.post('/cfg', async (req, res) => {
	try {

		// Verificar que el usuario tiene acceso a la fwcloud y al firewall al cual se quiere asignar la configuración.
		
		const cfg = await openvpnModel.addCfg(req);

		// Now create all the options for the OpenVPN configuration.
		for (let opt of req.body.options) {
			opt.cfg = cfg;
			await openvpnModel.addCfgOpt(req,opt);
		}
	} catch(error) { return api_resp.getJson(null, api_resp.ACR_ERROR, 'Error creating OpenVPN configuration', objModel, error, jsonResp => res.status(200).json(jsonResp)) }

  api_resp.getJson(null,api_resp.ACR_OK, 'OpenVPN configuration created', objModel, null, jsonResp => res.status(200).json(jsonResp));
});

module.exports = router;