#!/bin/bash
found=0

while IFS= read -r -d '' file; do
  if grep -nE '[~^]' "$file" | grep -v '~/' >/dev/null; then
    echo "Non-exact version found in: $file"
    grep -nE '[~^]' "$file" | grep -v '~/'
    found=1
  fi
done < <(find . -type f -name "package.json" -not -path "*/node_modules/*" -print0)

if [ "$found" -ne 0 ]; then
  echo "Error: Non-exact versions (tilde ~ or caret ^) detected in package.json files."
  exit 1
fi
