#!/bin/bash

if grep -Rn android/src/main/cpp -e '^#include "'; then
    echo 'Found `#include "..."` in `android/src/main/cpp/` directory. Convert it to `#include <...>`, e.g. `#include <reanimated/AndroidUIScheduler.h>`.'
    exit 1
fi

if grep -Rn android/src/main/cpp -e "^(#if DEBUG|#ifdef DEBUG)"; then
    echo 'Found DEBUG macro in `android/` directory. Use `#ifndef NDEBUG` macro instead.'
    exit 1
fi

if grep -Rn android/src/main/cpp -e "/^#ifndef(?! NDEBUG)"; then
    echo 'Found `#ifndef` in `android/` directory. Use `#ifdef ... #else` instead.'
    exit 1
fi
