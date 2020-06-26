#!/bin/bash

set -e

yarnversion="1.22.4"
yarnshasum="bc5316aa110b2f564a71a3d6e235be55b98714660870c5b6b2d2d3f12587fb58"

curl -fSLo /tmp/yarn.tar.gz "https://yarnpkg.com/downloads/$yarnversion/yarn-v$yarnversion.tar.gz"
echo "${yarnshasum}  /tmp/yarn.tar.gz" | shasum -c -
tar xzf /tmp/yarn.tar.gz -C "/usr/local"
rm /tmp/yarn.tar.gz
# link yarn binary
yarnbin="/usr/local/yarn-v${yarnversion}/bin"
ln -nfs ${yarnbin}/yarn /usr/local/bin/yarn
