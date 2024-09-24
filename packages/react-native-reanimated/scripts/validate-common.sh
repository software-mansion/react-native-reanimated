#!/bin/bash

if grep -Rn Common/cpp -e '#include "' ; then
    echo "Found #include with double quotes in \`Common/cpp/\` directory. Convert them to angle-bracket imports, e.g. \`#include <reanimated/Fabric/PropsRegistry.h>\`." && false
fi

if grep -Rn Common/cpp/worklets -e '#include <reanimated/' ; then
    echo "Found \`#include <reanimated/**/*.h>\` in \`Common/cpp/worklets/'\` directory which is not allowed." && false
fi
