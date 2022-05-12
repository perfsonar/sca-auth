#!/bin/bash

# NOTE: Run as root 
# This script is used to generate openssl auth keys
# and jwt token, if they don't already exist

DEFAULTDIR="/etc/perfsonar/psconfig-web/auth"

DIR=${DIR:="/etc/perfsonar/psconfig-web/auth"}

mkdir -p $DIR

if [ ! -f "$DIR/auth.key" ]; then
    (
    echo "generating $DIR/auth.key/.pub"
    /usr/bin/openssl genrsa -out "$DIR/auth.key" 2048
    chown perfsonar:perfsonar "$DIR/auth.key"
    chmod 600 "$DIR/auth.key"
    /usr/bin/openssl rsa -in "$DIR/auth.key" -pubout > "$DIR/auth.pub"

    )
fi

if [ ! -f "$DIR/user.jwt" ]; then
    (
    echo "generating $DIR/user.jwt"
    NODE_CONFIG_DIR=/etc/perfsonar/psconfig-web NODE_PATH=/usr/lib/perfsonar/psconfig-web-admin/auth/node_modules /usr/bin/node /usr/lib/perfsonar/psconfig-web-admin/auth/bin/auth.js issue --scopes '{"common":["user"]}' --sub sca --out "$DIR/user.jwt"
    chown perfsonar:perfsonar "$DIR/user.jwt"
    chmod 600 "$DIR/user.jwt"
    )
fi

