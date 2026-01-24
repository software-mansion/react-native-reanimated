cmake_minimum_required(VERSION 3.15)
project(ReanimatedDevTools VERSION 1.0.0 LANGUAGES CXX)

# Default to Release build
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Optional FPS counter (disabled by default)
option(ENABLE_FPS_COUNTER "Enable FPS counter overlay" OFF)
option(FORCE_FETCHCONTENT_GLFW "Force download GLFW even if system version exists" OFF)

# ============================================================================
# GLFW: Hybrid approach (system package with FetchContent fallback)
# ============================================================================

# First, try to find system-installed GLFW (unless forced to use FetchContent)
if(NOT FORCE_FETCHCONTENT_GLFW)
    find_package(glfw3 3.3 QUIET)
endif()

if(glfw3_FOUND)
    message(STATUS "✓ Using system GLFW ${glfw3_VERSION}")

    # On some systems, find_package creates 'glfw' target, on others 'glfw3'
    # Normalize to 'glfw' target
    if(NOT TARGET glfw)
        if(TARGET glfw3)
            add_library(glfw INTERFACE IMPORTED)
            set_target_properties(glfw PROPERTIES
                INTERFACE_LINK_LIBRARIES glfw3
            )
        endif()
    endif()
else()
    message(STATUS "✗ System GLFW not found")
    message(STATUS "✓ Downloading GLFW 3.4 via FetchContent...")

    # Download and build GLFW from source
    include(FetchContent)
    FetchContent_Declare(
        glfw
        GIT_REPOSITORY https://github.com/glfw/glfw.git
        GIT_TAG        7b6aead9fb88b3623e3b3725ebb42670cbe4c579 # v3.4.0
        GIT_SHALLOW    TRUE
    )

    # Disable GLFW extras we don't need
    set(GLFW_BUILD_DOCS OFF CACHE BOOL "" FORCE)
    set(GLFW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
    set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
    set(GLFW_INSTALL OFF CACHE BOOL "" FORCE)

    FetchContent_MakeAvailable(glfw)
endif()

# ============================================================================
# OpenGL
# ============================================================================

find_package(OpenGL REQUIRED)

# ============================================================================
# ImGui Library
# ============================================================================

add_library(imgui STATIC
    vendor/imgui/imgui.cpp
    vendor/imgui/imgui_draw.cpp
    vendor/imgui/imgui_tables.cpp
    vendor/imgui/imgui_widgets.cpp
    vendor/imgui/backends/imgui_impl_glfw.cpp
    vendor/imgui/backends/imgui_impl_opengl3.cpp
)

target_include_directories(imgui PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/vendor/imgui
    ${CMAKE_CURRENT_SOURCE_DIR}/vendor/imgui/backends
)

# Link GLFW (works regardless of source - system or FetchContent)
target_link_libraries(imgui PUBLIC glfw OpenGL::GL)

# Disable warnings for third-party ImGui code
if(MSVC)
    target_compile_options(imgui PRIVATE /W0)
else()
    target_compile_options(imgui PRIVATE -w)
endif()

# ============================================================================
# Protocol & Data Processing Libraries
# ============================================================================

# Protocol support library
add_library(protocol STATIC
    src/protocol.cpp
)
target_include_directories(protocol PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    # Shared protocol definitions from Reanimated
    ${CMAKE_CURRENT_SOURCE_DIR}/../../packages/react-native-reanimated/Common/cpp
)
target_link_libraries(protocol PUBLIC imgui)

# Data processing library
add_library(data STATIC
    src/data/mutation_processor.cpp
    src/data/profiler_processor.cpp
    src/data/network_handler.cpp
)
target_include_directories(data PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)
target_link_libraries(data PUBLIC protocol)

# Window rendering library
add_library(windows STATIC
    src/windows/controls_window.cpp
    src/windows/mutations_window.cpp
    src/windows/view_tree_window.cpp
    src/windows/profiler_window.cpp
    src/windows/fps_window.cpp
)
target_include_directories(windows PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)
target_link_libraries(windows PUBLIC imgui data)
if(ENABLE_FPS_COUNTER)
    target_compile_definitions(windows PUBLIC ENABLE_FPS_COUNTER)
endif()

# ============================================================================
# Main Executable
# ============================================================================

add_executable(reanimated-devtools main.cpp)
target_include_directories(reanimated-devtools PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)
target_link_libraries(reanimated-devtools PRIVATE imgui data windows)
if(ENABLE_FPS_COUNTER)
    target_compile_definitions(reanimated-devtools PRIVATE ENABLE_FPS_COUNTER)
endif()

# Platform-specific flags
if(APPLE)
    target_compile_definitions(reanimated-devtools PRIVATE GL_SILENCE_DEPRECATION)
    target_link_libraries(reanimated-devtools PRIVATE
        "-framework Cocoa"
        "-framework IOKit"
        "-framework CoreVideo"
    )
elseif(UNIX)
    target_link_libraries(reanimated-devtools PRIVATE dl pthread)
endif()

# Compiler warnings (only for our code, not ImGui)
if(MSVC)
    target_compile_options(reanimated-devtools PRIVATE /W4)
else()
    target_compile_options(reanimated-devtools PRIVATE -Wall -Wextra)
endif()

# Optimization flags
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    if(MSVC)
        target_compile_options(reanimated-devtools PRIVATE /O2)
    else()
        target_compile_options(reanimated-devtools PRIVATE -O2)
    endif()
elseif(CMAKE_BUILD_TYPE STREQUAL "Debug")
    if(MSVC)
        target_compile_options(reanimated-devtools PRIVATE /Zi)
    else()
        target_compile_options(reanimated-devtools PRIVATE -g)
    endif()
endif()
