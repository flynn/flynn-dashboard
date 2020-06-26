#!/bin/bash

set -e

ref="5239bdd5f33754683abf5680db6d067de0240984"

# download flynn controller api protobuf file
mkdir -p /flynn-controller-api/generated
curl -fSLo /flynn-controller-api/controller.proto "https://raw.githubusercontent.com/flynn/flynn/$ref/controller/api/controller.proto"

# generate TypeScript client lib
protoc -I /usr/local/include -I /flynn-controller-api \
    --plugin="protoc-gen-ts=/usr/local/bin/protoc-gen-ts" \
    --js_out="import_style=commonjs,binary:/flynn-controller-api/generated" \
    --ts_out="service=grpc-web:/flynn-controller-api/generated" \
    /flynn-controller-api/controller.proto
