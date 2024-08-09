#!/bin/bash

if grep -Rn apple -e '#import "' ; then
    echo "Found #import with double quotes in \`ios/\` directory. Convert them to angle-bracket imports, e.g. \`#import <RNReanimated/REAModule.h>\`." && false
fi
