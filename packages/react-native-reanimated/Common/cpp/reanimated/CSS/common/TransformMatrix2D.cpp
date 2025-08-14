#include <reanimated/CSS/common/TransformMatrix2D.h>

namespace reanimated::css {

TransformMatrix2D::TransformMatrix2D(Vec9Array matrix)
    : matrix_(std::move(matrix)) {}

TransformMatrix2D::TransformMatrix2D(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  const auto array = value.asObject(rt).asArray(rt);
  if (array.size(rt) != 9) {
    throw std::invalid_argument(
        "[Reanimated] Matrix array should have 9 elements");
  }
}
} // namespace reanimated::css
