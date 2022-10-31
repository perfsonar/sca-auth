docker build -t perfsonar/sca-auth ..
if [ ! $? -eq 0 ]; then
    echo "failed to build"
    exit
fi
docker tag perfsonar/sca-auth perfsonar/sca-auth:1.0.2
docker push perfsonar/sca-auth
