#!/bin/bash

set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cd ${ROOT}

mkdir -p cache/yarn
export YARN_CACHE_FOLDER=/workspace/cache/yarn

yarn install
yarn build
