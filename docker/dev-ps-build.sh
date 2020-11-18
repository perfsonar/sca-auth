#!/usr/bin/bash
VERSION=`cat version`
echo "preparing sca-auth version $VERSION"
docker build -t perfsonar/sca-auth:$VERSION --no-cache --force-rm ..
if [ ! $? -eq 0 ]; then
    echo "failed to build"
    exit
fi
#docker tag perfsonar/sca-auth perfsonar/sca-auth:latest
#docker push perfsonar/sca-auth:latest
#docker tag perfsonar/sca-auth perfsonar/sca-auth:dev
#docker push perfsonar/sca-auth:dev
docker tag perfsonar/sca-auth perfsonar/sca-auth:$VERSION
docker push perfsonar/sca-auth:$VERSION
