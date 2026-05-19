#!/bin/bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SETTINGS_FILE="$REPO_ROOT/.vscode/settings.json"
TEMPLATE_FILE="$REPO_ROOT/.vscode/settings.json.template"

if [ ! -f "$SETTINGS_FILE" ]; then
  echo "Creating .vscode/settings.json from template..."
  cp "$TEMPLATE_FILE" "$SETTINGS_FILE"
fi
