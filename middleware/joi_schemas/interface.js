/*
    Copyright 2019 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
    https://soltecsis.com
    info@soltecsis.com


    This file is part of FWCloud (https://fwcloud.net).

    FWCloud is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    FWCloud is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with FWCloud.  If not, see <https://www.gnu.org/licenses/>.
*/


var schema = {};
module.exports = schema;

const Joi = require('joi');
const sharedSch = require('./shared');
const fwcError = require('../../utils/error_table');

schema.validate = req => {
	var i = 1;
	return new Promise(async(resolve, reject) => {
		var schema = Joi.object().keys({ fwcloud: sharedSch.id });

		if (req.method === 'POST' || (req.method === 'PUT' && req.url === '/interface')) {
			schema = schema.append({
				firewall: sharedSch.id.allow(null).optional(),
				host: sharedSch.id.allow(null).optional(),
				name: sharedSch.name,
				labelName: sharedSch.name.allow(null).allow('').optional(),
				type: sharedSch.interface_type,
				interface_type: sharedSch.interface_type,
				comment: sharedSch.comment,
				mac: sharedSch.mac_addr.allow(null).allow('').optional(),
			});
			if (req.method === 'POST') schema = schema.append({ node_parent: sharedSch.id, node_order: sharedSch.id, node_type: sharedSch.name });
			else if (req.method === 'PUT') schema = schema.append({ id: sharedSch.id });
		} else if (req.method === 'PUT') {
			if (req.url === '/interface/fw/all/get' || req.url === '/interface/fw/full/get')
				schema = schema.append({ firewall: sharedSch.id });
			else if (req.url === '/interface/fw/get')
				schema = schema.append({ firewall: sharedSch.id, id: sharedSch.id });
			else if (req.url === '/interface/host/all/get')
				schema = schema.append({ host: sharedSch.id });
			else if (req.url === '/interface/host/get')
				schema = schema.append({ host: sharedSch.id, id: sharedSch.id });
			else if (req.url === '/interface/fw/del')
				schema = schema.append({ firewall: sharedSch.id, id: sharedSch.id, type: sharedSch.interface_type });
			else if (req.url === '/interface/host/del')
				schema = schema.append({ host: sharedSch.id, id: sharedSch.id, type: sharedSch.interface_type });
			else if (req.url === '/interface/where' || req.url === '/interface/where/rules')
				schema = schema.append({ id: sharedSch.id, type: sharedSch.interface_type });
			else if (req.url === '/interface/restricted')
				schema = schema.append({ id: sharedSch.id, host: sharedSch.id.optional() });
		} else return reject(fwcError.BAD_API_CALL);

		try {
			await Joi.validate(req.body, schema, sharedSch.joiValidationOptions);
			resolve();
		} catch (error) { return reject(error) }
	});
};