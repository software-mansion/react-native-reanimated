#!/bin/bash

if grep -Rn Common/cpp -e '^#include "'; then
    echo 'Found `#include "..."` in `Common/cpp/` directory. Convert it to `#include <...>`, e.g. `#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>`.'
    exit 1
fi
