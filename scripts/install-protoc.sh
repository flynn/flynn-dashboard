#!/bin/bash

set -e

protoc_version="3.12.3"
protoc_shasum="90257aed22e983a6772fb5af259a14d8f78deac0814a7df76a741975ffeea1c0"
protoc_url="https://github.com/google/protobuf/releases/download/v${protoc_version}/protoc-${protoc_version}-linux-x86_64.zip"

# install protobuf compiler
curl -sL "${protoc_url}" > /tmp/protoc.zip
echo "${protoc_shasum}  /tmp/protoc.zip" | shasum -c -
unzip -d /usr/local /tmp/protoc.zip
rm /tmp/protoc.zip

# install typescript protoc (https://github.com/improbable-eng/ts-protoc-gen)
npm install -g google-protobuf@3.11.2 ts-protoc-gen@0.12.0
