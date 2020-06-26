#!/bin/bash

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd ${ROOT}
scripts/install-yarn.sh
yarn install
yarn build
