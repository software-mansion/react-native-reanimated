#!/bin/bash

yarn tsc --noEmit --target es6 --module ESNext --jsx react-native --skipLibCheck true --allowSyntheticDefaultImports true --moduleResolution node --esModuleInterop true --strict true --forceConsistentCasingInFileNames true --resolveJsonModule $@

