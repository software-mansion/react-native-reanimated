#pragma once

#include <reanimated/CSS/common/transforms/TransformMatrix.h>
#include <reanimated/CSS/common/transforms/TransformOp.h>
#include <reanimated/CSS/common/transforms/vectors.h>

#include <folly/dynamic.h>
#include <utility>

namespace reanimated::css {

namespace {
static constexpr size_t MATRIX_2D_DIMENSION = 3; // 3x3 matrix
}

class TransformMatrix2D
    : public TransformMatrixBase<TransformMatrix2D, MATRIX_2D_DIMENSION> {
 public:
  struct Decomposed {
    Vector2D scale;
    double skew;
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

  template <TransformOp TOperation>
  static TransformMatrix2D create(double value);

  bool operator==(const TransformMatrix2D &other) const override;

  double determinant() const override;
  void translate2d(const Vector2D &translation);
  void scale2d(const Vector2D &scale);

  std::optional<Decomposed> decompose() const;
  static TransformMatrix2D recompose(const Decomposed &decomposed);

 private:
  Vector2D getTranslation() const;
  static std::pair<Vector2D, double> computeScaleAndSkew(
      std::array<Vector2D, 2> &rows);
  static double computeRotation(std::array<Vector2D, 2> &rows);
};

} // namespace reanimated::css
