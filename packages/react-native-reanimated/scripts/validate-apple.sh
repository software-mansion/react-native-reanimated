#!/bin/bash

if grep -Rn apple -e '^#include '; then
    echo 'Found `#include` in `apple/` directory. Convert it to `#import`, e.g. `#import <reanimated/apple/REAModule.h>`.' && false
fi

if grep -Rn apple -e '^#import "'; then
    echo 'Found `#import "..."` in `apple/` directory. Convert it to `#import <...>`, e.g. `#import <reanimated/apple/REAModule.h>`.' && false
fi

if grep -Rn apple -e '^#import <RNReanimated/'; then
    echo 'Found `#import <RNReanimated/...>` in `apple/` directory. Convert it to `#import <reanimated/...>`, e.g. `#import <reanimated/apple/REAModule.h>`.' && false
fi
