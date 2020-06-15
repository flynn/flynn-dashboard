#!/bin/bash

set -e

dir=$(pwd)

cid=$(docker create flynn:dashboard)
docker cp "$cid:/generated.tar.gz" ./src/generated/generated.tar.gz
cd ./src/generated/
tar -xzvf generated.tar.gz
rm -rf generated.tar.gz
cd $dir
