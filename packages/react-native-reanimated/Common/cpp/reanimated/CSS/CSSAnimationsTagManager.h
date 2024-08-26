#pragma once

#include <queue>

namespace reanimated {

class CSSAnimationsTagManager {
 public:
  unsigned int getTag();

 private:
  unsigned int nextTag = 0;
};

} // namespace reanimated
