#!/bin/bash
# Eliminate those annoying annotations from GitHub Actions
echo "::remove-matcher owner=eslint-compact::"
echo "::remove-matcher owner=eslint-stylish::"
echo "::remove-matcher owner=tsc::"
