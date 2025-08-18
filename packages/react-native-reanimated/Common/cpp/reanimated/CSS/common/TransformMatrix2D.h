#pragma once

#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/common/vectors.h>

#include <folly/dynamic.h>

namespace reanimated::css {

namespace {
static constexpr size_t MATRIX_2D_DIMENSION = 3; // 3x3 matrix
}

class TransformMatrix2D
    : public TransformMatrixBase<TransformMatrix2D, MATRIX_2D_DIMENSION> {
 public:
  struct Decomposed {
    Vector2D scale;
    Vector2D skew;
    double rotation;
    Vector2D translation;

#ifndef NDEBUG
    friend std::ostream &operator<<(
        std::ostream &os,
        const Decomposed &decomposed);
#endif // NDEBUG

    Decomposed interpolate(double progress, const Decomposed &other) const;
  };

  using TransformMatrixBase<TransformMatrix2D, MATRIX_2D_DIMENSION>::
      TransformMatrixBase;

  static TransformMatrix2D Identity();
  static TransformMatrix2D Rotate(double v);
  static TransformMatrix2D Scale(double v);
  static TransformMatrix2D ScaleX(double v);
  static TransformMatrix2D ScaleY(double v);
  static TransformMatrix2D TranslateX(double v);
  static TransformMatrix2D TranslateY(double v);
  static TransformMatrix2D SkewX(double v);
  static TransformMatrix2D SkewY(double v);

  double determinant() const override;

  std::optional<Decomposed> decompose() const;
  static TransformMatrix2D recompose(const Decomposed &decomposed);

  std::unique_ptr<TransformMatrix> expand(
      size_t targetDimension) const override;
};

} // namespace reanimated::css
