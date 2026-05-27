#!/bin/bash

if grep -Rn "$@" --include='*.h' --include='*.cpp' --include='*.m' --include='*.mm' -e '^#include <worklets/' | grep -v '<worklets/Compat/StableApi.h>'; then
    echo "Found disallowed \`#include <worklets/...>\` in \`Common/\`, \`apple/\` or \`android/\`. Only \`#include <worklets/Compat/StableApi.h>\` is permitted."
    exit 1
fi
