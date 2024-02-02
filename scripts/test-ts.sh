#!/bin/bash

ARGS=$@
FILES=""

for path in $ARGS; do
  if [ -d $path ]; then
    FILES_IN_DIR=""
    FILES_IN_DIR+=$(ls $path | grep ".tsx\|.ts|.d.ts")
    for file in $FILES_IN_DIR; do
      FILES+="$path/$file "
    done
  else
    FILES+="$path "
  fi
done

yarn tsc --noEmit --target es6 --module ESNext --jsx react-native --skipLibCheck true --allowSyntheticDefaultImports true --moduleResolution node --esModuleInterop true --strict true --forceConsistentCasingInFileNames true --resolveJsonModule $FILES
