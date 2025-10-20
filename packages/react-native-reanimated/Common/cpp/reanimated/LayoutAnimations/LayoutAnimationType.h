#pragma once

#include <cstdint>

typedef enum LayoutAnimationType : std::uint8_t {
  ENTERING = 1,
  EXITING = 2,
  LAYOUT = 3,
} LayoutAnimationType;
