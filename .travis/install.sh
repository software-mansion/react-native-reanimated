#!/bin/bash -e

NODE_V=${NODE_VERSION:-'13.3.0'}

echo "installing node"
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