#!/bin/bash

if ! which cmake-lint >/dev/null; then
  echo "error: cmake-lint is not installed"
  exit 1
fi

if ! which cmake-format >/dev/null; then
  echo "error: cmake-format is not installed"
  exit 1
fi

cmake-lint "$@" --line-width 120 && cmake-format --check "$@"
