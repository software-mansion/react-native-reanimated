#include <reanimated/CSS/common/TransformMatrix2D.h>

namespace reanimated::css {

TransformMatrix2D::TransformMatrix2D(const Vec9Array &matrix)
    : matrix_(matrix) {}

TransformMatrix2D::TransformMatrix2D(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  const auto array = value.asObject(rt).asArray(rt);
  if (array.size(rt) != 9) {
    throw std::invalid_argument(
        "[Reanimated] 2D matrix array should have 9 elements");
  }
  matrix_ = array;
}

TransformMatrix2D::TransformMatrix2D(const folly::dynamic &value)
    : matrix_(value) {
  if (!value.isArray() || value.size() != 9) {
    throw std::invalid_argument(
        "[Reanimated] 2D matrix array should have 9 elements");
  }
  matrix_ = value;
}

TransformMatrix2D TransformMatrix2D::Identity() {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  }); // clang-format on
}

} // namespace reanimated::css
