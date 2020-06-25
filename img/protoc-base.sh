#!/bin/bash

set -e

protoc_version="3.12.3"
protoc_shasum="90257aed22e983a6772fb5af259a14d8f78deac0814a7df76a741975ffeea1c0"
protoc_url="https://github.com/google/protobuf/releases/download/v${protoc_version}/protoc-${protoc_version}-linux-x86_64.zip"

apt-get update
apt-get install --yes unzip curl
apt-get clean

# install protobuf compiler
curl -sL "${protoc_url}" > /tmp/protoc.zip
echo "${protoc_shasum}  /tmp/protoc.zip" | shasum -c -
unzip -d /usr/local /tmp/protoc.zip
rm /tmp/protoc.zip

# install nodejs
nodeversion="12.18.1"
nodeshasum="863f816967e297c9eb221ad3cf32521f7ac46fffc66750e60f159ed63809affa"
curl -fSLo /tmp/node.tar.xz "https://nodejs.org/dist/v${nodeversion}/node-v${nodeversion}-linux-x64.tar.xz"
echo "${nodeshasum}  /tmp/node.tar.xz" | shasum -c -
tar xf /tmp/node.tar.xz -C "/usr/local"
rm /tmp/node.tar.xz
# link nodejs binary
nodebin="/usr/local/node-v${nodeversion}-linux-x64/bin"
ln -nfs ${nodebin}/node /usr/local/bin/node
ln -nfs ${nodebin}/npm /usr/local/bin/npm

# install typescript protoc (https://github.com/improbable-eng/ts-protoc-gen)
npm install -g google-protobuf@3.11.2 ts-protoc-gen@0.12.0
ln -nfs ${nodebin}/protoc-gen-ts /usr/local/bin/protoc-gen-ts
