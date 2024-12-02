#!/bin/bash

if grep -Rn Common/cpp -e '^#include "'; then
    echo 'Found `#include "..."` in `Common/cpp/` directory. Convert it to `#include <...>`, e.g. `#include <reanimated/Fabric/PropsRegistry.h>`.'
    exit 1
fi

if grep -Rn Common/cpp/worklets -e '^#include .*reanimated\/'; then
    echo 'Found `#include` from Reanimated in Worklets which is not allowed.'
    exit 1
fi

if grep -Rn Common/cpp/worklets -e 'namespace reanimated'; then
    echo 'Found `namespace reanimated` usage in Worklets which is not allowed.'
    exit 1
fi

if grep -Rn Common/cpp/worklets -e 'reanimated::'; then
    echo 'Found `reanimated::` usage in Worklets which is not allowed.'
    exit 1
fi
