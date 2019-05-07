var express = require('express');
var router = express.Router();
const customerModel = require('../../models/user/customer');
const restrictedCheck = require('../../middleware/restricted');
const fwcError = require('../../utils/error_table');


/**
 * @api {POST} /customer New customer
 * @apiName NewCustomer
 * @apiGroup CUSTOMER
 * 
 * @apiDescription Create new customer. Customers allow group users.
 *
 * @apiParam {Number} [customer] New customer's id.
 * <\br>The API will check that don't exists another customer with this id.
 * @apiParam {String} name Customer's name.
 * <\br>The API will check that don't exists another customer with the same name.
 * @apiParam {String} [addr] Customer's address.
 * @apiParam {String} [phone] Customer's telephone.
 * @apiParam {String} [email] Customer's e-mail.
 * @apiParam {String} [web] Customer's website.
 * 
 * @apiParamExample {json} Request-Example:
 * {
 *   "customer": 1,
 *   "name": "SOLTECSIS, S.L.",
 *   "addr": "C/Carrasca,7 - 03590 Altea (Alicante) - Spain",
 *   "phone": "+34 966 446 046",
 *   "email": "info@soltecsis.com",
 *   "web": "https://soltecsis.com"
 * }
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 204 No Content
 *
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *   "fwcErr": 1004,
 *   "msg": "Already exists with the same id"
 * }
 * 
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *   "fwcErr": 1005,
 *   "msg": "Already exists with the same name"
 * }
 */
router.post('', async (req, res) => {
	try {
		// Verify that don't already exists a customer with the id or name indicated as a parameter in the body request.
		if (req.body.customer && (await customerModel.existsId(req.dbCon,req.body.customer))) 
			throw fwcError.ALREADY_EXISTS_ID;
		
		if (await customerModel.existsName(req.dbCon,req.body.name))
			throw fwcError.ALREADY_EXISTS_NAME;
		
		await customerModel.insert(req);
		res.status(204).end();
	} catch (error) { res.status(400).json(error) }
});


/**
 * @api {PUT} /customer Update customer
 * @apiName UpdateCustomer
 * @apiGroup CUSTOMER
 * 
 * @apiDescription Update customer's information.
 *
 * @apiParam {Number} [customer] Id of the customer that you want modify.
 * @apiParam {String} name Customer's name.
 * <\br>The API will check that don't exists another customer with the same name.
 * @apiParam {String} [addr] Customer's address.
 * @apiParam {String} [phone] Customer's telephone.
 * @apiParam {String} [email] Customer's e-mail.
 * @apiParam {String} [web] Customer's website.
 * 
 * @apiParamExample {json} Request-Example:
 * {
 *   "customer": 1,
 *   "name": "SOLTECSIS, S.L.",
 *   "addr": "C/Carrasca, 7 - 03590 Altea (Alicante) - Spain",
 *   "phone": "+34 966 446 046",
 *   "email": "info@soltecsis.com",
 *   "web": "https://soltecsis.com"
 * }
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 204 No Content
 *
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *   "fwcErr": 1002,
 *   "msg": "Not found"
 * }
 *
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *   "fwcErr": 1005,
 *   "msg": "Already exists with the same name"
 * }
 */
router.put('', async (req, res) => {
	try {
		if (!(await customerModel.existsId(req.dbCon,req.body.customer)))
			throw fwcError.NOT_FOUND;

		// Verify that don't already exists a customer with same name indicated in the body request.
		if ((await customerModel.existsName(req.dbCon,req.body.name)) != req.body.customer)
			throw fwcError.ALREADY_EXISTS_NAME;

		await customerModel.update(req);
		res.status(204).end();
	} catch (error) { res.status(400).json(error) }
});


/**
 * @api {PUT} /customer/get Get customer data
 * @apiName GetCustomer
 * @apiGroup CUSTOMER
 * 
 * @apiDescription Get customer data. 
 *
 * @apiParam {Number} [customer] Id of the customer.
 * <\br>If empty, the API will return the id and name for all the customers.
 * <\br>If it is not empty, it will return all the data for the indicated customer id.
 * 
 * @apiParamExample {json} Request-Example:
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * [
 *    {
 *        "id": 1,
 *        "name": "SOLTECSIS, S.L."
 *    },
 *    {
 *        "id": 2,
 *        "name": "FWCloud.net"
 *    },
 *    {
 *        "id": 1001,
 *        "name": "SOLTECSIS 2, S.L."
 *    }
 * ]
 * 
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *   "fwcErr": 1002,
 *   "msg": "Not found"
 * }
 */
router.put('/get', async (req, res) => {
	try {
		if (req.body.customer && !(await customerModel.existsId(req.dbCon,req.body.customer)))
			throw fwcError.NOT_FOUND;

		res.status(200).json(await customerModel.get(req));
	} catch (error) { res.status(400).json(error) }
});


/**
 * @api {PUT} /customer/del Delete customer
 * @apiName DelCustomer
 * @apiGroup CUSTOMER
 * 
 * @apiDescription Delete customer from the database. 
 * <\br>A middleware is used for verify that the customer has no users before allow the deletion.
 *
 * @apiParam {Number} customer Customer's id.
 * 
 * @apiParamExample {json} Request-Example:
 * {
 *   "customer": 1
 * }
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 204 No Content
 * 
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *   "fwcErr": 1002,
 *   "msg": "Not found"
 * }
 * 
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 403 Forbidden
 * {
 *    "result": true,
 *    "restrictions": {
 *        "CustomerHasUsers": true
 *    }
 * }
*/
router.put('/del', 
restrictedCheck.customer,
async (req, res) => {
	try {
		if (!(await customerModel.existsId(req.dbCon,req.body.customer)))
			throw fwcError.NOT_FOUND;

		await customerModel.delete(req);
		res.status(204).end();
	} catch (error) { res.status(400).json(error) }
});


/**
 * @api {PUT} /customer/restricted Restrictions for customer deletion
 * @apiName DelCustomer
 * @apiGroup CUSTOMER
 * 
 * @apiDescription Check that there are no restrictions for customer deletion.
 *
 * @apiParam {Number} customer Customer's id.
 * 
 * @apiParamExample {json} Request-Example:
 * {
 *   "customer": 10
 * }
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 204 No Content
 * 
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 403 Forbidden
 * {
 *    "result": true,
 *    "restrictions": {
 *        "CustomerHasUsers": true
 *    }
 * }
 */
router.put('/restricted', restrictedCheck.customer, (req, res) => res.status(204).end());

module.exports = router;