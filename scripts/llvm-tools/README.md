# LLVM Tools use in repo

This repository uses clang-tidy for linting and clangd for IDE features for
native C++ and ObjC files. These tools are compilation-dependent — they need
to know how each file is compiled to work properly — but that also means they
can be much more accurate and powerful than regex-based linters.

clangd is a language server for C/C++ that provides features like code
completion, diagnostics, and more in your IDE.

clang-tidy is a linter for C/C++ that provides diagnostics and fixes based
on the code's compilation context.

This directory contains scripts that allow these tools to work within the
Reanimated codebase — a non-trivial integration.

## Required tools

You can install all these tools with homebrew.

### clangd

https://github.com/llvm/llvm-project

It's best to use clang directly from mainstream LLVM releases, since it's
backwards compatible.

A clangd binary is available in the Xcode toolchain, but it's a fork of the
original LLVM implementation and it misses a lot of features.

Android NDK doesn't provide a clangd binary.

### clang-tidy

https://github.com/llvm/llvm-project/releases

clang-tidy is a bit more complicated than clangd to set up. It must
understand some of the build artifacts (i.e. PCH files) to work properly,
and newer versions of clang-tidy aren't always backwards compatible with
older build artifacts.

The Xcode toolchain doesn't provide a clang-tidy binary.

The Android NDK provides a clang-tidy binary, and that's the one that has
to be used for Android files — mainstream LLVM clang-tidy doesn't
understand all of the NDK's build artifacts.

Scripts in this repository automatically pick the right clang-tidy binary
based on the file being linted, so you don't have to worry about it as
long as both LLVM and NDK clang-tidy binaries are available.

### xcode-build-server (only for iOS)

xcode-build-server is a utility tool that parses Xcode's build logs into a
format acceptable by the LLVM tools. You have to add its binary into a
very general PATH (e.g. `/usr/local/bin`) since it's invoked from a build
phase script that doesn't inherit the PATH from your shell.
Repository link: https://github.com/SolaWing/xcode-build-server

## How it works

These scripts hook into the Fabric Example's build pipeline on both
platforms — an Xcode build phase on iOS, a Gradle hook on CMake's configure
phase on Android — and assemble a `compile_commands.json` for the whole
codebase that LLVM tools can then consume.

### iOS

1. CocoaPods adds a build phase to the example app.
1. After the Xcode build, the phase waits for Xcode to finish writing its
   build log.
1. `xcode-build-server` parses that log into an initial compilation
   database for the iOS side.
1. Now we proceed to the merging step.

### Android

1. Reanimated and Worklets each apply a Gradle hook that runs after
   CMake's configure phase emits its per-arch compilation databases.
1. Now we proceed to the merging step.

### Merge and filter

The merging step takes whatever databases are currently on disk — the iOS
one written by `xcode-build-server`, the per-arch Android ones written by
CMake — and produces a single `compile_commands.json` for each of
Reanimated and Worklets.

1. All input databases are gathered (single files, or directories walked
   recursively) and sorted by modification time, oldest first.
1. Every entry is filtered: non-standard fields are dropped, and flags
   that only Apple's clang accepts (e.g. Xcode's index-store paths) are
   removed from the command line.
1. Filtered entries are inserted into a map keyed by source-file path.
   Because inputs are processed oldest-first, the freshest input's entry
   overwrites earlier ones for any file that appears in more than one
   source.
1. The resulting map is serialized into the package's
   `compile_commands.json`. Every translation unit keeps a compile command
   from whichever platform built it most recently; files compiled on only
   one platform keep that platform's command, so building one side never
   invalidates the other.

## Motivation for merging

The iOS and Android builds are independent and use different toolchains,
so they produce separate compilation databases. But for the best IDE
experience we want a single database that has entries for all files, with
the right flags for each platform. We don't want the IDE features to stop
working once we re-compile the app on a different platform.
