#!/bin/bash

if grep -Rn apple -e '^#include '; then
    echo 'Found `#include` in `apple/` directory. Convert it to `#import`, e.g. `#import <reanimated/apple/REAModule.h>`.'
    exit 1
fi

if grep -Rn apple -e '^#import "'; then
    echo 'Found `#import "..."` in `apple/` directory. Convert it to `#import <...>`, e.g. `#import <reanimated/apple/REAModule.h>`.'
    exit 1
fi

if grep -Rn apple -e '^#import <RNReanimated\/'; then
    echo 'Found `#import <RNReanimated/...>` in `apple/` directory. Convert it to `#import <reanimated/...>`, e.g. `#import <reanimated/apple/REAModule.h>`.'
    exit 1
fi

if grep -Rn apple/worklets -e '^#include .*reanimated\/'; then
    echo 'Found `#include` from Reanimated in Worklets which is not allowed.'
    exit 1
fi

if grep -Rn apple/worklets -e 'namespace reanimated'; then
    echo 'Found `namespace reanimated` usage in Worklets which is not allowed.'
    exit 1
fi

if grep -Rn android/src/main/cpp/worklets -e 'reanimated::'; then
    echo 'Found `reanimated::` usage in Worklets which is not allowed.'
    exit 1
fi
