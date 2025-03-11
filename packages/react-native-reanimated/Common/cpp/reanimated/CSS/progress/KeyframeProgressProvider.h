#pragma once

#include <string>

namespace reanimated {

class KeyframeProgressProvider {
 public:
  virtual double getGlobalProgress() const = 0;

  virtual double getKeyframeProgress(double fromOffset, double toOffset)
      const = 0;
};

} // namespace reanimated
