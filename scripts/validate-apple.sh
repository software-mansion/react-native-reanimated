#!/bin/bash

if grep -Rn apple -e '^#include '; then
    echo 'Found `#include` in `apple/` directory. Convert it to `#import`, e.g. `#import <reanimated/apple/ReanimatedModule.h>`.'
    exit 1
fi

if grep -Rn apple -e '^#import "'; then
    echo 'Found `#import "..."` in `apple/` directory. Convert it to `#import <...>`, e.g. `#import <reanimated/apple/ReanimatedModule.h>`.'
    exit 1
fi

if grep -Rn apple -e '^#import <RNReanimated\/'; then
    echo 'Found `#import <RNReanimated/...>` in `apple/` directory. Convert it to `#import <reanimated/...>`, e.g. `#import <reanimated/apple/ReanimatedModule.h>`.'
    exit 1
fi

if grep -Rn apple -e '^#import <RNWorklets\/'; then
    echo 'Found `#import <RNWorklets/...>` in `apple/` directory. Convert it to `#import <worklets/...>`, e.g. `#import <worklets/apple/WorkletsModule.h>`.'
    exit 1
fi

if grep -Rn apple -e "^(#if DEBUG|#ifdef DEBUG)"; then
    echo 'Found DEBUG macro in `apple/` directory. Use `#ifndef NDEBUG` macro instead.'
    exit 1
fi

if grep -Rn apple -e "/^#ifndef(?! NDEBUG)"; then
    echo 'Found `#ifndef` in `apple/` directory. Use `#ifdef ... #else` instead.'
    exit 1
fi
