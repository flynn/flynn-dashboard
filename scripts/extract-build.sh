#!/bin/bash

set -e

cid=$(docker create flynn:dashboard)
rm -rf ./build
docker cp "$cid:/app/build" ./build
docker rm $cid
