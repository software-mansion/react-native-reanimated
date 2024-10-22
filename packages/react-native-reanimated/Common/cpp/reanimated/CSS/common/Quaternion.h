#pragma once

#include <cmath>
#include <iostream>

namespace reanimated {

struct Quaternion {
  double x, y, z, w;

  bool operator==(const Quaternion &other) const;
  friend std::ostream &operator<<(
      std::ostream &os,
      const Quaternion &quaternion);

  Quaternion interpolate(const double progress, const Quaternion &other) const;
};

} // namespace reanimated
