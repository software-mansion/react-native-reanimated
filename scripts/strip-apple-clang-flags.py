#!/usr/bin/env python3
import sys, json

src, dst = sys.argv[1], sys.argv[2]
with open(src) as f:
    db = json.load(f)

flags_with_arg = {'-ivfsstatcache', '-index-store-path', '-index-unit-output-path', '--serialize-diagnostics'}
flags_exact = {'-fdiagnostics-show-note-include-stack', '-fno-implicit-modules', '-fregister-global-dtors-with-atexit', '-fpascal-strings', '-fskip-odr-check-in-gmf', '-fmodules-validate-once-per-build-session', '-fno-cxx-modules', '--analyze'}
flag_prefixes = ('-fmodule-name=', '-fmodule-map-file=', '-fmodules-prune-interval=', '-fmodules-prune-after=', '-fbuild-session-file=', '-fgnuc-version=', '-fmax-type-align=', '-mlinker-version=')
xclang_exact = {'-fno-odr-hash-protocols', '-code-extended-block-signature'}
xclang_prefixes = ('-clang-vendor-feature=',)

def filter_args(args):
    out, i = [], 0
    while i < len(args):
        arg = args[i]
        if arg in flags_with_arg:
            i += 2
        elif arg in flags_exact or any(arg.startswith(p) for p in flag_prefixes):
            i += 1
        elif arg == '-Xclang' and i + 1 < len(args):
            nxt = args[i + 1]
            if nxt in xclang_exact or any(nxt.startswith(p) for p in xclang_prefixes):
                i += 2
            else:
                out.append(arg); i += 1
        else:
            out.append(arg); i += 1
    return out

filtered = []
for entry in db:
    if entry.get('file', '').endswith('.mm'):
        continue
    if 'arguments' in entry:
        entry['arguments'] = filter_args(entry['arguments'])
    filtered.append(entry)

with open(dst, 'w') as f:
    json.dump(filtered, f, indent=2)
