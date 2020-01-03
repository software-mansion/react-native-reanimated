#!/bin/bash -e

NODE_VERSION="13.3.0"

echo "installing node, version $NODE_VERSION"
nvm install $NODE_VERSION
nvm use $NODE_VERSION
nvm alias default $NODE_VERSION
node --version
echo 'Installing react-native-cli, detox-cli, yarn'
npm install -g react-native-cli
npm install -g detox-cli
npm install -g yarn
echo 'Installing packages...'
yarn