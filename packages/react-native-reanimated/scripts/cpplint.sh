#!/bin/bash

if which cpplint >/dev/null; then
  cpplint --linelength=230 --filter=-legal/copyright,-readability/todo,-build/namespaces,-whitespace/comments,-whitespace/parens,-build/c++11,-runtime/references,+build/namespaces_headers,+build/namespaces,+build/endif_comment --quiet --recursive "$@"
else
  echo "error: cpplint not installed, download from https://github.com/cpplint/cpplint" 1>&2
  exit 1
fi
