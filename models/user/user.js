var db = require('../../db.js');


//create object
var userModel = {};
//Export the object
module.exports = userModel;

var utilsModel = require("../../utils/utils.js");


var logger = require('log4js').getLogger("app");

//Get all users
userModel.getUsers = function (customer, callback) {

    db.get(function (error, connection) {
        if (error)
            callback(error, null);
        connection.query('SELECT *  FROM user WHERE customer=' + connection.escape(customer) + ' ORDER BY id', function (error, rows) {
            if (error)
                callback(error, null);
            else
                callback(null, rows);
        });
    });
};





//Get user by  id
userModel.getUser = function (customer, id, callback) {
    db.get(function (error, connection) {
        if (error)
            callback(error, null);
        var sql = 'SELECT * FROM user WHERE customer=' + connection.escape(customer) + ' AND id = ' + connection.escape(id);
        connection.query(sql, function (error, row) {
            if (error)
                callback(error, null);
            else
                callback(null, row);
        });
    });
};

//Get user by  username
userModel.getUserName = function (customer, username, callback) {
    db.get(function (error, connection) {
        if (error)
            callback(error, null);
        var sql = 'SELECT * FROM user WHERE customer=' + connection.escape(customer) + ' AND username like  ' + connection.escape('%' + username + '%') + ' ORDER BY username';

        connection.query(sql, function (error, row) {
            if (error)
                callback(error, null);
            else
                callback(null, row);
        });
    });
};

//Add new user
userModel.insertUser = function (userData, callback) {
    db.get(function (error, connection) {
        if (error)
            callback(error, null);
        connection.query('INSERT INTO user SET ?', userData, function (error, result) {
            if (error) {
                callback(error, null);
            } else {
                //devolvemos la última id insertada
                callback(null, {"insertId": result.insertId});
            }
        });
    });
};

//Update user
userModel.updateUser = function (userData, callback) {

    db.get(function (error, connection) {
        if (error)
            callback(error, null);
        var sql = 'UPDATE user SET username = ' + connection.escape(userData.username) + ',' +
                'email = ' + connection.escape(userData.email) + ',' +
                'name = ' + connection.escape(userData.name) + ',' +
                'customer = ' + connection.escape(userData.customer) + ',' +
                'password = ' + connection.escape(userData.password) + ',' +
                'allowed_ip = ' + connection.escape(userData.allowed_ip) + ',' +
                'role = ' + connection.escape(userData.role) + ',' +
                'WHERE id = ' + userData.id;
        connection.query(sql, function (error, result) {
            if (error) {
                callback(error, null);
            } else {
                callback(null, {"result": true});
            }
        });
    });
};

//Update user TimeStamp
userModel.updateUserTS = function (userData, callback) {

    db.get(function (error, connection) {
        if (error)
            callback(error, null);
        var sql = 'UPDATE user SET ' +
                'last_access = NOW() ' +
                'WHERE id = ' + userData.id;
        connection.query(sql, function (error, result) {
            if (error) {
                callback(error, null);
            } else {
                callback(null, {"result": true});
            }
        });
    });
};

//Update user confirmation_token
userModel.updateUserCT = function (iduser, token, callback) {
    return new Promise((resolve, reject) => {
        db.get(function (error, connection) {
            if (error)
                reject(error);
            var sql = 'UPDATE user SET ' +
                    ' confirmation_token =  ' + connection.escape(token) +
                    ' WHERE id = ' + connection.escape(iduser);
            connection.query(sql, function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    });
};

//Check User CONFIRMATION TOKEN
userModel.checkConfirmationtoken = function (userData) {
    return new Promise((resolve, reject) => {
        try {
            db.get(function (error, connection) {
                if (error)
                    reject(error);

                var sql = 'SELECT confirmation_token FROM user WHERE id=' + connection.escape(userData.iduser);

                connection.query(sql, function (error, row) {
                    if (error)
                        reject(error);
                    else if (row) {                        
                        var CT = row[0].confirmation_token;
                        logger.debug("COMPARANDO TOKEN USER: ", CT);
                        logger.debug("CON TOKEN REQUEST: ", userData.confirm_token );
                        
                        if (userData.confirm_token === '' || userData.confirm_token === undefined || userData.confirm_token !== CT) {
                            //generate new token
                            var new_token = userData.sessionID + "_" + utilsModel.getRandomString(20);
                            logger.debug("----> GENERATED NEW CONFIRMATION TOKEN: ", new_token);
                            userModel.updateUserCT(userData.iduser, new_token)
                                    .then(resp => {
                                        resolve({"result": false, "token": new_token});
                                    })
                                    .catch(e => reject(e));

                        } else {
                            //token valid
                            //REMOVE token
                            userModel.updateUserCT(userData.iduser, "")
                                    .then(resp => {
                                        resolve({"result": true, "token": ""});
                                    })
                                    .catch(e => reject(e));
                            
                        }
                    }
                    else
                        reject(false);
                });
            });
        } catch (e) {
            reject(e);
        }
    });
};


//Remove user with id to remove
userModel.deleteUser = function (id, callback) {
    db.get(function (error, connection) {
        if (error)
            callback(error, null);
        var sqlExists = 'SELECT * FROM user WHERE id = ' + connection.escape(id);
        connection.query(sqlExists, function (error, row) {
            //If exists Id from user to remove
            if (row) {
                db.get(function (error, connection) {
                    var sql = 'DELETE FROM user WHERE id = ' + connection.escape(id);
                    connection.query(sql, function (error, result) {
                        if (error) {
                            callback(error, null);
                        } else {
                            callback(null, {"result": true});
                        }
                    });
                });
            } else {
                callback(null, {"result": false});
            }
        });
    });
};

