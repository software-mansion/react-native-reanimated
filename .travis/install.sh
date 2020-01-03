#!/bin/bash -e

echo 'Installing react-native-cli, detox-cli, yarn'
npm install -g react-native-cli >/dev/null 2>&1
npm install -g detox-cli >/dev/null 2>&1
npm install -g yarn >/dev/null 2>&1
echo 'Installing packages...'
yarn