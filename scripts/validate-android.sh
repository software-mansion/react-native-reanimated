#!/bin/bash

if grep -Rn android/src/main/cpp -e '^#include "'; then
    echo 'Found `#include "..."` in `android/src/main/cpp/` directory. Convert it to `#include <...>`, e.g. `#include <reanimated/AndroidUIScheduler.h>`.'
    exit 1
fi
