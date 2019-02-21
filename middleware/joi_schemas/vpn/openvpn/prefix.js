var schema = {};
module.exports = schema;

const Joi = require('joi');
const sharedSch = require('../../shared');
 
schema.validate = req => {
  return new Promise(async (resolve, reject) => {
    var schema = Joi.object().keys({ fwcloud: sharedSch.id });

    if (req.method==="POST") {
      schema = schema.append({ openvpn: sharedSch.id, name: sharedSch.cn });
    }
    else if (req.method==="PUT") {
      schema = schema.append({ prefix: sharedSch.id });
      if (req.url==='/vpn/pki/prefix')
        schema = schema.append({ name: sharedSch.cn });
    } else return reject(new Error('Request method not accepted'));

    try {
      await Joi.validate(req.body, schema, sharedSch.joiValidationOptions);
      resolve();
    } catch(error) { return reject(error) } 
  });
};
