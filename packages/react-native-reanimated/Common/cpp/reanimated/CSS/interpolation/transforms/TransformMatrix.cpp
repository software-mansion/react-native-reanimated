#include <reanimated/CSS/TransformMatrix.h>

namespace reanimated {

const size_t MATRIX_SIZE = 16;

TransformMatrix::TransformMatrix(jsi::Runtime &rt, const jsi::Value &value) {
  const auto array = value.asObject(rt).asArray(rt);
  if (array.size(rt) != MATRIX_SIZE) {
    throw std::invalid_argument(
        "[Reanimated] TransformMatrix should have 16 elements");
  }

  // TODO - implement
}

jsi::Value TransformMatrix::toJSIValue(jsi::Runtime &rt) const {
  // TODO - implement
  return jsi::Value::undefined();
}

} // namespace reanimated
