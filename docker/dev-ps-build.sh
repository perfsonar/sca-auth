VER=4.2.3

docker build -t perfsonar/sca-auth:$VER ..
if [ ! $? -eq 0 ]; then
    echo "failed to build"
    exit
fi
docker tag perfsonar/sca-auth:$VER perfsonar/sca-auth:$VER
docker push perfsonar/sca-auth:$VER
