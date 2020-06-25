#!/bin/bash

set -e

cid=$(docker create flynn:dashboard)
docker cp "$cid:/flynn-controller-api/generated" ./src/
docker rm $cid
