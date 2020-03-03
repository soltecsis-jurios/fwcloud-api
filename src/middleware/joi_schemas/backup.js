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
	return new Promise(async(resolve, reject) => {
		var schema = {};

		if (req.method==='POST' && req.url==='/backup') {
			schema = { comment: sharedSch.comment };
		}
		else if (req.method==='PUT' && (req.url==='/backup/get' || req.url==='/backup/config/get')) {
			schema = {};
		}
		else if (req.method==='PUT' && (req.url==='/backup/del' || req.url==='/backup/restore')) {
			schema = Joi.object().keys({ backup: sharedSch.backup_id })
		}
		else if (req.method==='PUT' && req.url==='/backup/config') {
			schema = Joi.object().keys({ 	schedule: sharedSch.cron_schedule, 
																		 max_copies: Joi.number().integer().min(0).max(100000),
																		 max_days: Joi.number().integer().min(0).max(100000)
																});
		}
		else return reject(fwcError.BAD_API_CALL);

		try {
			await Joi.validate(req.body, schema, sharedSch.joiValidationOptions);
			resolve();
		} catch (error) { return reject(error) }
	});
};