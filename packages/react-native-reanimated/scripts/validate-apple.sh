#!/bin/bash

if grep -Rn apple -e '#import "' ; then
    echo "Found #import with double quotes in \`apple/\` directory. Convert them to angle-bracket imports, e.g. \`#import <RNReanimated/REAModule.h>\`." && false
fi

if grep -Rn apple -e '#include "' ; then
    echo "Found #include with double quotes in \`apple/\` directory. Convert them to angle-bracket imports, e.g. \`#include <RNReanimated/NativeProxy.h>\`." && false
fi
