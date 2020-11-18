#!/bin/bash

cp -f /app/docker/sbin/pwa_auth /usr/sbin/pwa_auth

#This script is used inside the docker container to start api and ui(via http-server)

if [ ! -f /app/api/config/auth.key ]; then
    (
    echo "generating auth.key/.pub"
    cd /app/api/config
    openssl genrsa -out auth.key 2048
    chmod 600 auth.key
    openssl rsa -in auth.key -pubout > auth.pub

    )
fi

if [ ! -f /app/api/config/user.jwt ]; then
    (
    echo "generating user.jwt"
    node /app/bin/auth.js issue --scopes '{"common":["user"]}' --sub sca --out /app/api/config/user.jwt
    chmod 600 user.jwt
    )
fi

echo "starting auth api"
pm2 start /app/api/auth.js

echo "starting http-server for ui"
#http-server -p 80 -a 0.0.0.0 /app/ui
pm2 start http-server --name ui -- -p 80 -a :: -d false /app/ui

pm2 logs
