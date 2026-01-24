# Reanimated DevTools Server

A C++ desktop application for profiling React Native applications using Reanimated

## Features

- Layout Inspector for React Native views based on the mutations created by the Fabric renderer
- Real-time profiler timeline visualization

### GLFW Installation

The build system uses a **hybrid approach** for GLFW:

1. **System GLFW found**: Uses your installed GLFW
2. **No system GLFW**: Automatically downloads and compiles GLFW 3.4 from source via CMake FetchContent

## Quick Start

```bash
# Configure (defaults to Release build)
cmake -B build

# Build
cmake --build build

# Run
./build/reanimated-devtools
```

## Build Options

### Release vs Debug

```bash
# Release (default, optimized with -O2)
cmake -B build

# Debug (with symbols, no optimization)
cmake -B build -DCMAKE_BUILD_TYPE=Debug
```

### FPS Counter

Enable the optional FPS counter overlay (displayed in top-right corner):

```bash
cmake -B build -DENABLE_FPS_COUNTER=ON
cmake --build build
```

### Force FetchContent GLFW

Force downloading GLFW even if system version exists:

```bash
cmake -B build -DFORCE_FETCHCONTENT_GLFW=ON
```

## Build Output

```
build/
├── reanimated-devtools          # Main executable
└── compile_commands.json        # LSP configuration (auto-generated)
```

## Development

### LSP/IDE Setup

The build automatically generates `compile_commands.json` for clangd and other language servers.

## Clean Build

```bash
rm -rf build/
cmake -B build
cmake --build build
```

## Troubleshooting

### Old build artifacts

Remove old Makefile build artifacts:

```bash
rm -f *.o devtools-server compile_commands.json
rm -rf imgui/  # Old cloned imgui repository
```

## Notes

ImGui is included under MIT License (see `vendor/imgui/LICENSE.txt`).
