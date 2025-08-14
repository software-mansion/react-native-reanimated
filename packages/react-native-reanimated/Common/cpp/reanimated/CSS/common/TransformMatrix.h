#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <folly/dynamic.h>

namespace reanimated::css {

class TransformMatrix {
 public:
  virtual ~TransformMatrix() = default;
};

template <size_t TSize>
class TransformMatrixBase : public TransformMatrix {
 public:
  explicit TransformMatrixBase(const std::array<double, TSize> &matrix)
      : matrix_(matrix) {}

  explicit TransformMatrixBase(jsi::Runtime &rt, const jsi::Value &value) {
    const auto array = value.asObject(rt).asArray(rt);
    if (array.size(rt) != TSize) {
      throw std::invalid_argument(
          "[Reanimated] Matrix array should have " + std::to_string(TSize) +
          " elements");
    }

    for (size_t i = 0; i < TSize; ++i) {
      matrix_[i] = array.getValueAtIndex(rt, i).asNumber();
    }
  }

  explicit TransformMatrixBase(const folly::dynamic &array) {
    if (!array.isArray() || array.size() != TSize) {
      throw std::invalid_argument(
          "[Reanimated] Matrix array should have " + std::to_string(TSize) +
          " elements");
    }

    for (size_t i = 0; i < TSize; ++i) {
      matrix_[i] = array[i].asDouble();
    }
  }

 protected:
  std::array<double, TSize> matrix_;
};

} // namespace reanimated::css
