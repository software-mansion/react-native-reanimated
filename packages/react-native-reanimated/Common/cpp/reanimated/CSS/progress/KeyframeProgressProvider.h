#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <string>

namespace reanimated {

class KeyframeProgressProvider {
 public:
  virtual double getGlobalProgress() const = 0;
  virtual bool isFirstUpdate() const = 0;

  virtual double getKeyframeProgress(double fromOffset, double toOffset)
      const = 0;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
