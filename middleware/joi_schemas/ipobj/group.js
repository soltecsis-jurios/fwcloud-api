var schema = {};
module.exports = schema;

const Joi = require('joi');
const sharedSch = require('../shared');
const fwcError = require('../../../utils/error_table');

schema.validate = req => {
	return new Promise(async(resolve, reject) => {
		var schema = Joi.object().keys({ fwcloud: sharedSch.id });

		if (req.method === 'POST' || (req.method === 'PUT' && req.url === '/ipobj/group')) {
			schema = schema.append({
				name: sharedSch.name,
				type: sharedSch.group_type,
				comment: sharedSch.comment
			});
			if (req.method === 'PUT') schema = schema.append({ id: sharedSch.id });
			else if (req.method === 'POST') schema = schema.append({ node_parent: sharedSch.id, node_order: sharedSch.id, node_type: sharedSch.name });
		} else if (req.method === 'PUT') {
			if (req.url==='/ipobj/group/get' || req.url==='/ipobj/group/where')
				schema = schema.append({ id: sharedSch.id });
			else if (req.url === '/ipobj/group/del' || req.url === '/ipobj/group/restricted')
				schema = schema.append({ id: sharedSch.id, type: sharedSch.group_type });
			else if (req.url === '/ipobj/group/addto') {
				schema = schema.append({ 
					node_parent: sharedSch.id, 
					node_order: sharedSch.id, 
					node_type: sharedSch.name, 
					ipobj_g: sharedSch.id, 
					ipobj: sharedSch.id
				});
			}
			else if (req.url === '/ipobj/group/delfrom') {
				schema = schema.append({ 
					obj_type: sharedSch.id, 
					ipobj_g: sharedSch.id, 
					ipobj: sharedSch.id
				});
			}
		} else return reject(fwcError.BAD_API_CALL);


		try {
			await Joi.validate(req.body, schema, sharedSch.joiValidationOptions);

			// With this, the access control middleware will verify the openvpn and prefix objects.
			if (req.body.node_type === 'OCL') req.body.openvpn = req.body.ipobj;
			else if (req.body.node_type==='PRO') req.body.prefix = req.body.ipobj;
			
			resolve();
		} catch (error) { return reject(error) }
	});
};