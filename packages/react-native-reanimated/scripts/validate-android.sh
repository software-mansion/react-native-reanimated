#!/bin/bash

if grep -Rn android/src/main/cpp -e '^#include "'; then
    echo 'Found `#include "..."` in `android/src/main/cpp/` directory. Convert it to `#include <...>`, e.g. `#include <reanimated/AndroidUIScheduler.h>`.'
    exit 1
fi

if grep -Rn android/src/main/cpp/worklets -e '^#include .*reanimated\/'; then
    echo 'Found `#include` from Reanimated in Worklets which is not allowed.'
    exit 1
fi

if grep -Rn android/src/main/cpp/worklets -e 'namespace reanimated'; then
    echo 'Found `namespace reanimated` usage in Worklets which is not allowed.'
    exit 1
fi

if grep -Rn android/src/main/cpp/worklets -e 'reanimated::'; then
    echo 'Found `reanimated::` usage in Worklets which is not allowed.'
    exit 1
fi
