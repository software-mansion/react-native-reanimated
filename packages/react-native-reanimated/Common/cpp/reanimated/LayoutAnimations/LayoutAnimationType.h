#pragma once

#include <cstdint>

typedef enum class LayoutAnimationType : std::uint8_t {
  ENTERING = 1,
  EXITING = 2,
  LAYOUT = 3,
  SHARED_ELEMENT_TRANSITION = 4,
  SHARED_ELEMENT_TRANSITION_NATIVE_ID = 5,
} LayoutAnimationType;
