#pragma once

#include <cmath>

#ifndef NDEBUG
#include <iostream>
#endif // NDEBUG

namespace reanimated::css {

struct Quaternion {
  double x, y, z, w;

  bool operator==(const Quaternion &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const Quaternion &quaternion);
#endif // NDEBUG

  Quaternion interpolate(double progress, const Quaternion &other) const;
};

} // namespace reanimated::css
