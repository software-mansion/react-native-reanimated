#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <cmath>
#include <iostream>

namespace reanimated {

struct Quaternion {
  double x, y, z, w;

  bool operator==(const Quaternion &other) const;
  friend std::ostream &operator<<(
      std::ostream &os,
      const Quaternion &quaternion);

  Quaternion interpolate(double progress, const Quaternion &other) const;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
