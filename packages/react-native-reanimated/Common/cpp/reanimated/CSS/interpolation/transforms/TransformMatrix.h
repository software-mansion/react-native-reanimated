#pragma once

#include <reanimated/CSS/common/definitions.h>

namespace reanimated {

class TransformMatrix {
 public:
  TransformMatrix() : matrix_(IDENTITY_MATRIX_ARRAY) {}
  explicit TransformMatrix(const MatrixArray &matrix) : matrix_(matrix) {}
  TransformMatrix(jsi::Runtime &rt, const jsi::Value &value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;

  static TransformMatrix Identity() {
    return TransformMatrix(IDENTITY_MATRIX_ARRAY);
  }

 private:
  MatrixArray matrix_;

  static const MatrixArray IDENTITY_MATRIX_ARRAY;
};

const MatrixArray TransformMatrix::IDENTITY_MATRIX_ARRAY =
    {1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1};

} // namespace reanimated
