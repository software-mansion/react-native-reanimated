#!/bin/bash

if grep -Rn Common/cpp -e '^#include "'; then
    echo 'Found `#include "..."` in `Common/cpp/` directory. Convert it to `#include <...>`, e.g. `#include <reanimated/Fabric/PropsRegistry.h>`.' && false
fi

if grep -Rn Common/cpp/worklets -e '^#include <reanimated/'; then
    echo 'Found `#include <reanimated/...>` in `Common/cpp/worklets/` directory which is not allowed.' && false
fi
