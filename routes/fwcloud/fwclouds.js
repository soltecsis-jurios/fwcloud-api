/**
 * Module to routing FWCloud requests
 * <br>BASE ROUTE CALL: <b>/fwcloud</b>
 *
 * @module Fwcloud
 * 
 * 
 */

/**
 * Class to manage fwcloud routing
 * 
 * 
 * @class FwcloudRouter
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
 * Property  to manage Fwcloud route
 *
 * @property router
 * @type express.Router 
 */
var router = express.Router();

/**
 * Property Model to manage API RESPONSE data: {{#crossLinkModule "api_response"}}{{/crossLinkModule}}
 *
 * @property api_resp
 * @type api_respModel
 * 
 */
var api_resp = require('../../utils/api_response');

/**
 * Property to identify Data Object
 *
 * @property objModel
 * @type text
 */
var objModel = 'FWCLOUD';

/**
 * Property Model to manage Fwcloud Data
 *
 * @property FwcloudModel
 * @type ../../models/fwcloud
 * 
 * 
 */
var FwcloudModel = require('../../models/fwcloud/fwcloud');

/**
 * Property Logger to manage App logs
 *
 * @attribute logger
 * @type log4js/app
 * 
 */
var logger = require('log4js').getLogger("app");


var db = require('../../db.js');


/**
 * Get Fwclouds by User
 * 
 * 
 * > ROUTE CALL:  __/:iduser__      
 * > METHOD:  __GET__
 * 
 * @method getFwcloudByUser
 * 
 * @param {Integer} iduser User identifier
 * 
 * @return {JSON} Returns `JSON` Data from Fwcloud
 * @example #### JSON RESPONSE
 *    
 *       {"data" : [
 *          {  //Data Fwcloud 1       
 *           "id" : ,            //Fwcloud Identifier
 *           "created_at" : ,    //Date Created
 *           "updated_at" : ,    //Date Updated
 *           "updated_by" : ,   //User last update
 *          },
 *          {....}, //Data Fwcloud 2
 *          {....}  //Data Fwcloud ...n 
 *         ]
 *       };
 * 
 */
router.get('/:iduser', function (req, res)
{
    var iduser = req.params.iduser;
    FwcloudModel.getFwclouds(iduser, function (error, data)
    {
        //Get data
        if (data && data.length > 0)
        {
            api_resp.getJson(data, api_resp.ACR_OK, '', objModel, null, function (jsonResp) {
                res.status(200).json(jsonResp);
            });
        }
        //Get error
        else
        {
            api_resp.getJson(data, api_resp.ACR_NOTEXIST, 'not found', objModel, null, function (jsonResp) {
                res.status(200).json(jsonResp);
            });
        }
    });
});

/* Get fwcloud by Id */
/**
 * Get Fwclouds by ID and User
 * 
 * <br>ROUTE CALL:  <b>/fwcloud/:iduser/fwcloud/:id</b>
 * <br>METHOD: <b>GET</b>
 *
 * @method getFwcloudByUser_and_ID_V2
 * 
 * @param {Integer} iduser User identifier
 * @param {Integer} id Fwcloud identifier
 * 
 * @return {JSON} Returns Json Data from Fwcloud
 */
router.get('/:iduser/:fwcloud', function (req, res)
{
    var iduser = req.params.iduser;
    var fwcloud = req.params.fwcloud;

    if (!isNaN(fwcloud))
    {
        FwcloudModel.getFwcloud(iduser, fwcloud, function (error, data)
        {
            //get fwcloud data
            if (data && data.length > 0)
            {
                api_resp.getJson(data, api_resp.ACR_OK, '', objModel, null, function (jsonResp) {
                    res.status(200).json(jsonResp);
                });

            }
            //get error
            else
            {
                api_resp.getJson(data, api_resp.ACR_NOTEXIST, 'not found', objModel, null, function (jsonResp) {
                    res.status(200).json(jsonResp);
                });
            }
        });
    }
    //id must be numeric
    else
    {
        api_resp.getJson(null, api_resp.ACR_NOTEXIST, 'not found', objModel, null, function (jsonResp) {
            res.status(200).json(jsonResp);
        });
    }
});


/* Get fwcloud by fwcloud name  */
/**
 * Get Fwclouds by Name and User
 * 
 * <br>ROUTE CALL:  <b>/fwcloud/:iduser/name/:name</b>
 * <br>METHOD: <b>GET</b>
 *
 * @method getFwcloudByUser_and_Name_V2
 * 
 * @param {Integer} iduser User identifier
 * @param {String} name Fwcloud Name
 * 
 * @return {JSON} Returns Json Data from Fwcloud
 */
router.get('/:iduser/name/:name', function (req, res)
{
    var iduser = req.params.iduser;
    var name = req.params.name;

    if (name.length > 0)
    {
        FwcloudModel.getFwcloudName(iduser, name, function (error, data)
        {
            //get data
            if (data && data.length > 0)
            {
                api_resp.getJson(data, api_resp.ACR_OK, '', objModel, null, function (jsonResp) {
                    res.status(200).json(jsonResp);
                });

            }
            //get error
            else
            {
                api_resp.getJson(data, api_resp.ACR_NOTEXIST, 'not found', objModel, null, function (jsonResp) {
                    res.status(200).json(jsonResp);
                });
            }
        });
    }
    //id must be numeric
    else
    {
        api_resp.getJson(null, api_resp.ACR_NOTEXIST, 'not found', objModel, null, function (jsonResp) {
            res.status(200).json(jsonResp);
        });
    }
});


/**
 * CREATE New fwcloud
 * 
 * 
 * > ROUTE CALL:  __/fwcloud/fwcloud__      
 * > METHOD:  __POST__
 * 
 *
 * @method AddFwcloud
 * 
 * @param {Integer} id Fwcloud identifier (AUTO)
 * @param {String} name Fwcloud Name
 * @param {String} [comment] Fwcloud comment
 * 
 * @return {JSON} Returns Json result
 * @example 
 * #### JSON RESPONSE OK:
 *    
 *       {"data" : [
 *          { 
 *           "insertId : ID,   //fwcloud identifier           
 *          }
 *         ]
 *       };
 *       
 * #### JSON RESPONSE ERROR:
 *    
 *       {"data" : [
 *          { 
 *           "msg : ERROR,   //Text Error
 *          }
 *         ]
 *       };
 */
router.post("/fwcloud/:iduser", function (req, res)
{

    var fwcloudData = {
        id: null,
        name: req.body.name
    };
    var iduser = req.body.iduser;
    FwcloudModel.insertFwcloud(iduser, fwcloudData, function (error, data)
    {

        if (data && data.insertId)
        {
            var dataresp = {"insertId": data.insertId};
            api_resp.getJson(dataresp, api_resp.ACR_INSERTED_OK, 'INSERTED OK', objModel, null, function (jsonResp) {
                res.status(200).json(jsonResp);
            });
        } else
        {
            api_resp.getJson(data, api_resp.ACR_ERROR, 'Error', objModel, error, function (jsonResp) {
                res.status(200).json(jsonResp);
            });
        }
    });
});


/**
 * UPDATE fwcloud
 * 
 * 
 * > ROUTE CALL:  __/fwcloud/fwcloud__      
 * > METHOD:  __PUT__
 * 
 *
 * @method UpdateFwcloud
 * 
 * @param {Integer} id Fwcloud identifier
 * @optional
 * @param {Integer} iduser User identifier 
 * @param {String} name Fwcloud Name
 * 
 * @return {JSON} Returns Json result
 * @example 
 * #### JSON RESPONSE OK:
 *    
 *       {"data" : [
 *          { 
 *           "msg : "success",   //result
 *          }
 *         ]
 *       };
 *       
 * #### JSON RESPONSE ERROR:
 *    
 *       {"data" : [
 *          { 
 *           "msg : ERROR,   //Text Error
 *          }
 *         ]
 *       };
 */
router.put('/fwcloud/:iduser', function (req, res)
{

    //Save fwcloud data into objet
    var fwcloudData = {id: req.body.id, name: req.body.name, user: req.body.user};

    FwcloudModel.updateFwcloud(fwcloudData, function (error, data)
    {
        //Saved ok
        if (data && data.result)
        {
            api_resp.getJson(data, api_resp.ACR_UPDATED_OK, 'UPDATED OK', objModel, null, function (jsonResp) {
                res.status(200).json(jsonResp);
            });
        } else
        {
            api_resp.getJson(data, api_resp.ACR_ERROR, 'Error', objModel, error, function (jsonResp) {
                res.status(200).json(jsonResp);
            });
        }
    });
});

/**
 * Lock fwcloud status
 * 
 * 
 * > ROUTE CALL:  __/fwcloud/fwcloud/lock__      
 * > METHOD:  __PUT__
 * 
 *
 * @method UpdateFwcloudLock
 * 
 * @param {Integer} fwcloud Fwcloud id
 * @optional
 * @param {Integer} iduser User identifier
 * 
 * @return {JSON} Returns Json result
 * @example 
 * #### JSON RESPONSE OK:
 *    
 *       {"data" : [
 *          { 
 *           "msg : "success",   //result
 *          }
 *         ]
 *       };
 *       
 * #### JSON RESPONSE ERROR:
 *    
 *       {"data" : [
 *          { 
 *           "msg : ERROR,   //Text Error
 *          }
 *         ]
 *       };
 */
router.put('/fwcloud/lock/:iduser/:fwcloud', function (req, res)
{

    //Save fwcloud data into objet
    var fwcloudData = {fwcloud: req.params.fwcloud, iduser: req.params.iduser};

    FwcloudModel.updateFwcloudLock(fwcloudData)
            .then(data => {                
                if (data.result) {
                    logger.info("FWCLOUD: " + fwcloudData.fwcloud + "  LOCKED BY USER: " + fwcloudData.iduser);
                    api_resp.getJson(data, api_resp.ACR_UPDATED_OK, 'FWCLOUD LOCKED OK', objModel, null, function (jsonResp) {
                        res.status(200).json(jsonResp);
                    });
                } else {
                    logger.info("NOT ACCESS FOR LOCKING FWCLOUD: " + fwcloudData.fwcloud + "  BY USER: " + fwcloudData.iduser);
                    api_resp.getJson(data, api_resp.ACR_ERROR, 'Error locking', objModel, null, function (jsonResp) {
                        res.status(200).json(jsonResp);
                    });
                }
            })
            .catch(r => {                
                logger.info("ERROR LOCKING FWCLOUD: " + fwcloudData.fwcloud + "  BY USER: " + fwcloudData.iduser);
                api_resp.getJson(null, api_resp.ACR_ERROR, 'Error locking', objModel, r, function (jsonResp) {
                    res.status(200).json(jsonResp);
                });
            });


});

/**
 * Unlock fwcloud status
 * 
 * 
 * > ROUTE CALL:  __/fwcloud/fwcloud/unlock__      
 * > METHOD:  __PUT__
 * 
 *
 * @method UpdateFwcloudUnlock
 * 
 * @param {Integer} fwcloud Fwcloud cloud
 * @optional
 * @param {Integer} iduser User identifier
 * 
 * @return {JSON} Returns Json result
 * @example 
 * #### JSON RESPONSE OK:
 *    
 *       {"data" : [
 *          { 
 *           "msg : "success",   //result
 *          }
 *         ]
 *       };
 *       
 * #### JSON RESPONSE ERROR:
 *    
 *       {"data" : [
 *          { 
 *           "msg : ERROR,   //Text Error
 *          }
 *         ]
 *       };
 */
router.put('/fwcloud/unlock/:iduser/:fwcloud', function (req, res)
{

    //Save fwcloud data into objet
    var fwcloudData = {id: req.params.fwcloud, iduser: req.params.iduser};
    FwcloudModel.updateFwcloudUnlock(fwcloudData)
            .then(data => {
                if (data.result) {
                    logger.info("FWCLOUD: " + fwcloudData.id + "  UNLOCKED BY USER: " + fwcloudData.iduser);
                    api_resp.getJson(data, api_resp.ACR_UPDATED_OK, 'FWCLOUD UNLOCKED OK', objModel, null, function (jsonResp) {
                        res.status(200).json(jsonResp);
                    });
                } else {
                    logger.info("NOT ACCESS FOR UNLOCKING FWCLOUD: " + fwcloudData.id + "  BY USER: " + fwcloudData.iduser);
                    api_resp.getJson(data, api_resp.ACR_ERROR, 'Error unlocking', objModel, null, function (jsonResp) {
                        res.status(200).json(jsonResp);
                    });
                }
            }
            )
            .catch(error => {
                logger.info("ERROR UNLOCKING FWCLOUD: " + fwcloudData.id + "  BY USER: " + fwcloudData.iduser);
                api_resp.getJson(null, api_resp.ACR_ERROR, 'Error unlocking', objModel, error, function (jsonResp) {
                    res.status(200).json(jsonResp);
                });
            });

});
/* Get locked Status of fwcloud by Id */
/**
 * Get Locked status of Fwcloud by ID and User
 * 
 * <br>ROUTE CALL:  <b>/locked/:iduser/:fwcloud</b>
 * <br>METHOD: <b>GET</b>
 *
 * @method getLockedStatusFwcloudByUser_and_ID
 * @param {Integer} iduser User identifier
 * @param {Integer} id Fwcloud identifier
 * 
 * @return {JSON} Returns Json Data from Fwcloud
 */
router.get('/locked/:iduser/:fwcloud', function (req, res)
{

    var iduser = req.params.iduser;
    var fwcloud = req.params.fwcloud;
    if (!isNaN(fwcloud))
    {
        FwcloudModel.getFwcloud(iduser, fwcloud, function (error, data)
        {
            //get fwcloud data
            if (data && data.length > 0)
            {

                var resp = {"locked": false, "at": "", "by": ""};
                if (data[0].locked === 1) {
                    resp = {"locked": true, "at": data[0].locked_at, "by": data[0].locked_by};
                }

                api_resp.getJson(resp, api_resp.ACR_OK, '', "", null, function (jsonResp) {
                    res.status(200).json(jsonResp);
                });
            }
            //get error
            else
            {
                api_resp.getJson(data, api_resp.ACR_NOTEXIST, 'not found', objModel, null, function (jsonResp) {
                    res.status(200).json(jsonResp);
                });
            }
        });
    }
    //id must be numeric
    else
    {
        api_resp.getJson(null, api_resp.ACR_NOTEXIST, 'not found', objModel, null, function (jsonResp) {
            res.status(200).json(jsonResp);
        });
    }
});
/**
 * DELETE fwcloud
 * 
 * 
 * > ROUTE CALL:  __/fwcloud/fwcloud__      
 * > METHOD:  __DELETE__
 * 
 *
 * @method DeleteFwcloud
 * 
 * @param {Integer} fwcloud Fwcloud identifier
 * @optional
 * 
 * @return {JSON} Returns Json result
 * @example 
 * #### JSON RESPONSE OK:
 *    
 *       {"data" : [
 *          { 
 *           "msg : "success",   //result
 *          }
 *         ]
 *       };
 *       
 * #### JSON RESPONSE ERROR:
 *    
 *       {"data" : [
 *          { 
 *           "msg : ERROR,   //Text Error
 *          }
 *         ]
 *       };
 */
//FALTA CONTROLAR BORRADO EN CASCADA y PERMISOS 
router.put("/del/fwcloud/:iduser", function (req, res)
{

    var id = req.param('fwcloud');
    var iduser = req.param('iduser');
    FwcloudModel.deleteFwcloud(iduser, id, function (error, data)
    {
        if (data && data.result)
        {
            api_resp.getJson(data, api_resp.ACR_DELETED_OK, '', objModel, null, function (jsonResp) {
                res.status(200).json(jsonResp);
            });
        } else
        {
            api_resp.getJson(data, api_resp.ACR_ERROR, 'Error', objModel, error, function (jsonResp) {
                res.status(200).json(jsonResp);
            });
        }
    });
});
module.exports = router;