#include <reanimated/CSS/interpolation/transforms/TransformMatrix.h>

namespace reanimated {

const size_t MATRIX_SIZE = 16;

TransformMatrix::TransformMatrix(jsi::Runtime &rt, const jsi::Value &value) {
  const auto array = value.asObject(rt).asArray(rt);
  if (array.size(rt) != MATRIX_SIZE) {
    throw std::invalid_argument(
        "[Reanimated] TransformMatrix should have 16 elements");
  }

  for (size_t i = 0; i < MATRIX_SIZE; ++i) {
    matrix_[i] = array.getValueAtIndex(rt, i).asNumber();
  }
}

jsi::Value TransformMatrix::toJSIValue(jsi::Runtime &rt) const {
  jsi::Array result(rt, MATRIX_SIZE);

  for (size_t i = 0; i < MATRIX_SIZE; ++i) {
    result.setValueAtIndex(rt, i, matrix_[i]);
  }

  return result;
}

} // namespace reanimated
