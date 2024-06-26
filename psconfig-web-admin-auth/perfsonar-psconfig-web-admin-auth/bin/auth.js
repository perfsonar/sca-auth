#!/usr/bin/env node
"use strict";

///////////////////////////////////////////////////////////////////////////////////////////////////
//
// Update specified user's scope
//

var config = require("../api/config");

//contrib
var argv = require("optimist").argv;
var winston = require("winston");
var jwt = require("jsonwebtoken");
var fs = require("fs");
var _ = require("underscore");
const readlineSync = require("readline-sync");

var logger = new winston.Logger(config.logger.winston);
var db = require("../api/models");

const shortListCols = ["id", "active", "username", "email", "fullname"];

switch (argv._[0]) {
    case "modscope":
        modscope();
        break;
    case "modrole":
        modrole();
        break;
    case "listuser":
        listuser();
        break;
    case "issue":
        issue();
        break;
    case "setpass":
        setpass();
        break;
    case "useradd":
        useradd();
        break;
    case "usermod":
        usermod();
        break;
    case "userdel":
        userdel();
        break;
    default:
        console.log(
            fs.readFileSync(__dirname + "/usage.txt", { encoding: "utf8" })
        );
        break;
}

function listuser() {
    if (argv.id || argv.username || argv.email) {
        var condition = {
            where: {
                $or: [
                    { id: argv.id },
                    { username: argv.username },
                    { email: argv.email },
                ],
            },
            raw: true,
        };
    } else {
        condition = { raw: true };
    }

    db.User.findAll(condition).then(function (users) {
        if (users.length < 1) {
            console.error("No users found");
        }
        var compact = argv.compact;
        if (!argv.short) {
            if (!compact) {
                console.log(JSON.stringify(users, null, "   "));
            } else {
                console.log(JSON.stringify(users));
            }
        } else {
            console.log(shortListCols.join("\t"));
            _.map(users, function (user) {
                var row = [];
                _.each(shortListCols, function (col) {
                    row.push(user[col]);
                });
                console.log(row.join("\t"));
            });
        }
    });
}

function issue() {
    if (!argv.scopes || argv.sub === undefined) {
        logger.error(
            "pwa_auth issue --scopes '{common: [\"user\"]}' --sub 'my_service' [--exp 1514764800]  [--out token.jwt] [--key test.key]"
        );
        process.exit(1);
    }

    var claim = {
        iss: config.auth.iss,
        iat: Date.now() / 1000,
        sub: argv.sub,
    };
    if (argv.scopes) {
        claim.scopes = JSON.parse(argv.scopes);
    }
    if (argv.profile) {
        claim.profile = JSON.parse(argv.profile);
    }

    if (argv.exp) {
        claim.exp = argv.exp;
    }
    if (argv.key) {
        console.log("using specified private key");
        config.auth.private_key = fs.readFileSync(argv.key);
    }
    /*
        if(argv.pub) {
            console.log("using specified public key");
            config.auth.public_key = fs.readFileSync(argv.pub);
            //console.dir(config.auth);
        }
        */

    var token = jwt.sign(claim, config.auth.private_key, config.auth.sign_opt);
    if (argv.out) {
        fs.writeFileSync(argv.out, token);
    } else {
        console.log(token);
    }

    /*
        //verify to check
        jwt.verify(token, config.auth.public_key, function(err, decoded) {
            if(err) throw err;
            console.log("decoded:");
            console.log(JSON.stringify(decoded, null, 4));
        });
        */
}

function modrole() {
    if (!argv.username && !argv.id) {
        logger.error(
            'please specify --username <username> (or --id <userid>) --set/add/del \'["user","admin"]\''
        );
        process.exit(1);
    }

    function add(base, sub, scope) {
        if (sub.constructor == Array) {
            sub.forEach(function (item) {
                if (!(scope in base)) {
                    base[scope] = [item];
                } else {
                    if (!~base[scope].indexOf(item)) {
                        base[scope].push(item);
                        //base[scope] = item;
                    }
                }
            });
        } else {
            for (var k in sub) {
                if (base[k] === undefined) base[k] = sub[k];
                else add(base[k], sub[k]);
            }
        }
        return base;
    }

    function del(base, sub, scope) {
        if (typeof sub == "object" && sub.constructor == Array) {
            sub.forEach(function (item) {
                var pos = base[scope].indexOf(item);
                if (~pos) base[scope].splice(pos, 1);
            });
        } else if (typeof sub == "object") {
            for (var k in sub) {
                if (base[k] !== undefined) del(base[k], sub[k]);
            }
        }
        if (base[scope].length == 0) {
            delete base[scope];
        }
        return base;
    }

    db.User.findOne({
        where: {
            $or: [{ username: argv.username }, { id: argv.id }],
        },
    }).then(function (user) {
        if (!user) return logger.error("can't find user:" + argv.username);
        if (!(argv.set || argv.add || argv.del)) {
            logger.error("No action specified to modify role ");
            process.exit(1);
        }
        var scope = argv.scope;
        if (argv.set) {
            user.scopes[scope] = JSON.parse(argv.set);
        }
        if (typeof scope == "undefined" || scope === true) {
            logger.error("no scope specified");
            process.exit(1);
        }

        if (argv.add) {
            user.scopes = add(
                _.clone(user.scopes),
                JSON.parse(argv.add),
                scope
            );
        }
        if (argv.del) {
            if (!(scope in user.scopes)) {
                logger.info("Scope not exist; cannot delete roles within it");
                process.exit(1);
            }
            user.scopes = del(
                _.clone(user.scopes),
                JSON.parse(argv.del),
                scope
            );
        }
        user.save()
            .then(function () {
                logger.info(
                    "successfully updated user role. user must re-login for it to take effect)"
                );
                logger.info("Updated scopes: ", JSON.stringify(user.scopes));
            })
            .catch(function (err) {
                logger.error(err);
            });
    });
}

function modscope() {
    if (!argv.username && !argv.id) {
        logger.error(
            'please specify --username <username> (or --id <userid>) --set/add/del \'{{common: ["user", "admin"]}}\''
        );
        process.exit(1);
    }
    if (!(argv.set || argv.add || argv.del)) {
        logger.error("No action specified to modify scope");
        process.exit(1);
    }
    if (argv.scope) {
        logger.error(
            "Invalid parameter --scope. Did you mean to run 'modrole'?"
        );
        process.exit(1);
    }

    function add(base, sub) {
        if (sub.constructor == Array) {
            sub.forEach(function (item) {
                if (!~base.indexOf(item)) base.push(item);
            });
        } else {
            for (var k in sub) {
                if (base[k] === undefined) base[k] = sub[k];
                else add(base[k], sub[k]);
            }
        }
        return base;
    }

    function del(base, sub) {
        if (typeof sub == "object" && sub.constructor == Array) {
            sub.forEach(function (item) {
                delete base[item];
                /*
                    var pos = base.indexOf(item);
                    if(~pos) base.splice(pos, 1);
                    */
            });
        } else if (typeof sub == "object") {
            Object.keys(sub).forEach(function (k, index, self) {
                delete base[k];
                delete sub[k];
            });
        }
        return base;
    }

    db.User.findOne({
        where: {
            $or: [{ username: argv.username }, { id: argv.id }],
        },
    }).then(function (user) {
        if (!user) return logger.error("can't find user:" + argv.username);
        if (argv.set) {
            user.scopes = JSON.parse(argv.set);
        }
        if (argv.add) {
            user.scopes = add(_.clone(user.scopes), JSON.parse(argv.add));
        }
        if (argv.del) {
            user.scopes = del(_.clone(user.scopes), JSON.parse(argv.del));
        }
        user.save()
            .then(function () {
                logger.info(
                    "successfully updated user scope. user must re-login for it to take effect)"
                );
                process.exit();
            })
            .catch(function (err) {
                logger.error(err);
                process.exit(1);
            });
    });
}

function setpass() {
    if (!argv.username && !argv.id) {
        logger.error("please specify --username <username> or --id <userid>");
        process.exit(1);
    }

    db.User.findOne({
        where: {
            $or: [{ username: argv.username }, { id: argv.id }],
        },
    }).then(function (user) {
        if (!user) return logger.error("can't find user:" + argv.username);
        var newPassword = argv.password;
        if (typeof newPassword == "undefined") {
            // 'true' indicates we should prompt user for password
            newPassword = true;
        }
        if (newPassword === true) {
            var confirmPassword;
            while (confirmPassword != newPassword) {
                newPassword = readlineSync.question(
                    "Please enter new password: ",
                    {
                        hideEchoBack: true, // The typed text on screen is hidden by `*` (default).
                    }
                );
                confirmPassword = readlineSync.question(
                    "Please confirm new password: ",
                    {
                        hideEchoBack: true, // The typed text on screen is hidden by `*` (default).
                    }
                );
                if (newPassword != confirmPassword) {
                    console.log("passwords don't match; try again");
                }
            }
            if (newPassword == confirmPassword && newPassword != "") {
                console.log("updating password");
            } else {
                return logger.error(
                    "error updating password for user " +
                        user.username +
                        "; password must not be empty."
                );
            }
        }

        user.setPassword(newPassword, function (err) {
            if (err) throw err;
            user.save()
                .then(function () {
                    logger.log("successfully updated password");
                })
                .catch(function (err) {
                    logger.error(err);
                });
        });
    });
}

function usermod() {
    var updateFields = {};
    if (!argv.id) {
        logger.error(
            "You must specify a user id to modify, like this: --id <userid>"
        );
        process.exit(1);
    }

    if (argv.username && argv.username !== true) {
        logger.info("New username specified: " + argv.username);
        updateFields.username = argv.username;
    }
    if (argv.email && argv.email !== true) {
        logger.info("New email specified: " + argv.email);
        updateFields.email = argv.email;
    }
    if (argv.fullname && argv.fullname !== true) {
        logger.info("New fullname specified: " + argv.fullname);
        updateFields.fullname = argv.fullname;
    }
    var uniqueFieldChecks = {
        username: argv.username,
        email: argv.email,
    };
    var userExists = false;
    // make sure the user exists
    db.User.findOne({ where: { id: argv.id } }).then(function (user) {
        if (!user) return logger.error("can't find user:" + argv.id);
        if (user.username == argv.username || argv.username == null)
            delete uniqueFieldChecks.username;
        if (user.email == argv.email || argv.email == null)
            delete uniqueFieldChecks.email;
        db.User.findOne({
            where: {
                $or: [uniqueFieldChecks],
            },
        }).then(function (user) {
            //console.log("prevent duplicate user");
            if (user) userExists = true;

            if (userExists) {
                logger.error(
                    "Error: not updating user; username and email must be unique"
                );
                process.exit(1);
            }

            // make sure the user exists
            db.User.findOne({ where: { id: argv.id } }).then(function (user) {
                if (!user) return logger.error("can't find user:" + argv.id);
                var newPassword = argv.password;
            });

            // update the values
            db.User.update(updateFields, { where: { id: argv.id } }).then(
                function (user) {
                    console.log("Updated user ");
                }
            );
        });
    });
}

function useradd() {
    if (!argv.username) {
        logger.error("please specify --username <username>");
        process.exit(1);
    }
    if (!argv.fullname) {
        logger.error("please specify --fullname <fullname>");
        process.exit(1);
    }
    if (!argv.email) {
        logger.error("please specify --email <fullname>");
        process.exit(1);
    }

    // Check whether username/email already exist
    // Theoretically sequelize should prevent dupes, but that constraint is
    // not working
    var userExists = false;
    db.User.findOne({
        where: {
            $or: [{ username: argv.username }, { email: argv.email }],
        },
    }).then(function (user) {
        if (user) userExists = true;

        if (userExists) {
            logger.error(
                "User already exists; username and email must be unique"
            );
            process.exit(1);
        }

        var user = db.User.build(
            //extend from default
            Object.assign(
                {
                    username: argv.username,
                    fullname: argv.fullname,
                    email: argv.email,
                    email_confirmed: true,
                },
                config.auth.default
            )
        );
        user.save().then(function (_user) {
            if (!_user) return logger.error("couldn't register new user");
            logger.info("successfully created a user");
            if (argv.password) setpass();
            else logger.info("you might want to reset password / setscope");
        });
    });
}

function userdel() {
    if (!argv.username && !argv.id) {
        logger.error("please specify --username <username> or --id <userid>");
        process.exit(1);
    }

    //TODO - does this cascade to group?
    db.User.destroy({
        where: { $or: [{ username: argv.username }, { id: argv.id }] },
    }).then(function (count) {
        if (count == 1) logger.info("successfully removed user");
        else logger.info("failed to remove user - maybe doesn't exist?");
    });
}
