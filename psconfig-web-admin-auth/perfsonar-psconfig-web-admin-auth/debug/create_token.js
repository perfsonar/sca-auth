#!/usr/bin/node
var fs = require('fs');
var jwt = require('jsonwebtoken');
var cert = fs.readFileSync('../config/auth.key');
var payload = { 
    //sub: '1234567',
    //name: 'Soichi Hayashi',
    iat: 1416929061,
    jti: "802057ff9b5b4eb7fbb8856b6eb2cc5b",
    scopes: {
        common: ["user"],
        isdp: {
            actions: ['request']
        },
        /*
        users_app_metadata: {
            actions: ['read', 'create']
        }
        */
    }
};
var token = jwt.sign(payload, cert, { algorithm: 'RS256'});
console.dir(payload);
console.dir(token);
