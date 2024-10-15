#pragma once

#include <cmath>

namespace reanimated {

struct Quaternion {
  double x, y, z, w;

  bool operator==(const Quaternion &other) const {
    return x == other.x && y == other.y && z == other.z && w == other.w;
  }

  Quaternion slerp(const Quaternion &other, double progress);
  Quaternion accumulate(const Quaternion &other);
  Quaternion interpolate(const Quaternion &other, double progress);
};

} // namespace reanimated
