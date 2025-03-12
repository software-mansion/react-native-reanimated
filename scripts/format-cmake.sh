#!/bin/bash

if ! which cmake-format >/dev/null; then
  echo "error: cmake-format is not installed"
  exit 1
fi

cmake-format -i "$@"
