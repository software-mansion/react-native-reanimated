#!/bin/bash

if grep -Rn Common/cpp -e '^#include "'; then
    echo 'Found `#include "..."` in `Common/cpp/` directory. Convert it to `#include <...>`, e.g. `#include <reanimated/NativeModules/ReanimatedModuleProxy.h>`.'
    exit 1
fi

if grep -Rn Common/cpp/ -e "^(#if DEBUG|#ifdef DEBUG)"; then
    echo 'Found DEBUG macro in `Common/cpp/` directory. Use `#ifndef NDEBUG` macro instead.'
    exit 1
fi

if grep -Rn Common/cpp/ -e "^#ifndef(?! NDEBUG)"; then
    echo 'Found `#ifndef` in `Common/cpp/` directory. Use `#ifdef ... #else` instead.'
    exit 1
fi
