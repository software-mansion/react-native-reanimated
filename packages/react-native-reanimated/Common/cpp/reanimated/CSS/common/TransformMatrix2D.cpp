#include <reanimated/CSS/common/TransformMatrix2D.h>

namespace reanimated::css {

TransformMatrix2D TransformMatrix2D::Identity() {
  return TransformMatrix2D({1, 0, 0, 0, 1, 0, 0, 0, 1});
}

} // namespace reanimated::css
