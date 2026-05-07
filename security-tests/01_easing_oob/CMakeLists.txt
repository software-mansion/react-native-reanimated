# Builds a tiny test program that links against the **real** easing source
# files from packages/react-native-reanimated/Common/cpp/reanimated/CSS/easing.
# Run this with -DCMAKE_BUILD_TYPE=Asan and the program will SEGV on call,
# proving the OOB read in steps()/linear() when points is empty.

cmake_minimum_required(VERSION 3.20)
project(easing_oob_test CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Mirror the addressing flags Reanimated would build with.
add_compile_options(-Wall -Wextra -O0 -g -fsanitize=address -fno-omit-frame-pointer)
add_link_options(-fsanitize=address)

set(REANIMATED_ROOT ${CMAKE_CURRENT_LIST_DIR}/../../packages/react-native-reanimated)
set(REANIMATED_CPP ${REANIMATED_ROOT}/Common/cpp)

# We exercise the real source files. Their headers reference an EasingFunction
# typedef that lives in EasingFunctions.h alongside JSI types; we don't need
# the JSI-side parser for this test, only the lambda factories. To keep the
# scope minimal, we re-compile only the three files that are JSI-free.
add_executable(easing_oob_test
    ${REANIMATED_CPP}/reanimated/CSS/utils/algorithms.cpp
    ${REANIMATED_CPP}/reanimated/CSS/easing/linear.cpp
    ${REANIMATED_CPP}/reanimated/CSS/easing/steps.cpp
    main.cpp
)

# linear.cpp / steps.cpp #include "<reanimated/CSS/easing/linear.h>" — those
# headers transitively include EasingFunctions.h which pulls in <jsi/jsi.h>.
# The test cuts the JSI dependency out by providing a tiny shim include path
# that supplies a JSI-free EasingFunctions.h.
target_include_directories(easing_oob_test PRIVATE
    ${CMAKE_CURRENT_LIST_DIR}/shim
    ${REANIMATED_CPP}
)
