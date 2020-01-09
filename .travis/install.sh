#!/bin/bash -e

NODE_V=${NODE_VERSION:-'13.3.0'}
echo 'Installing nvm'
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.6/install.sh | bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
echo 'Installing node'
nvm install $NODE_V
nvm use $NODE_V
nvm alias default $NODE_V
node --version
echo 'Installing react-native-cli, detox-cli, yarn'
npm install -g react-native-cli
npm install -g detox-cli
npm install -g yarn
echo 'Installing packages...'
yarn

echo '============== DEBUG =============='
echo "$PATH"