#include <reanimated/CSS/CSSAnimationsTagManager.h>

namespace reanimated {
unsigned int CSSAnimationsTagManager::getTag() {
  return nextTag++;
}
} // namespace reanimated
