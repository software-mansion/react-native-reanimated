#!/bin/bash

if grep -Rn android/src/main/cpp -e '#include "' ; then
    echo "Found #include with double quotes in \`android/src/main/cpp/\` directory. Convert them to angle-bracket imports, e.g. \`#include <reanimated/AndroidUIScheduler.h>\`." && false
fi
