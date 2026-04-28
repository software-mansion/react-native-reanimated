#!/bin/bash
# Eliminate those annoying annotations from GitHub Actions
echo "::remove-matcher owner=oxlint::"
echo "::remove-matcher owner=tsc::"
