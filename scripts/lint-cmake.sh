#!/bin/bash

if ! which cmake-lint >/dev/null; then
  echo "error: cmake-lint is not installed"
  exit 1
fi

cmake-lint "$@"
