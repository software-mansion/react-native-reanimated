#pragma once

#include <reanimated/CSS/common/transforms/TransformMatrix.h>
#include <reanimated/CSS/common/transforms/TransformOp.h>
#include <reanimated/CSS/common/transforms/vectors.h>

#include <folly/dynamic.h>
#include <utility>

namespace reanimated::css {

static constexpr size_t MATRIX_2D_DIMENSION = 3; // 3x3 matrix

class TransformMatrix2D : public TransformMatrixBase<TransformMatrix2D, MATRIX_2D_DIMENSION> {
 public:
  struct Decomposed {
    Vector2D scale;
    double skew;
    double rotation;
    Vector2D translation;

#ifndef NDEBUG
    friend std::ostream &operator<<(std::ostream &os, const Decomposed &decomposed);
#endif // NDEBUG

    Decomposed interpolate(double progress, const Decomposed &other) const;
  };

  using TransformMatrixBase<TransformMatrix2D, MATRIX_2D_DIMENSION>::TransformMatrixBase;

  explicit TransformMatrix2D(jsi::Runtime &rt, const jsi::Value &value);
  explicit TransformMatrix2D(const folly::dynamic &array);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &value);
  static bool canConstruct(const folly::dynamic &array);

  template <TransformOp TOperation>
  static TransformMatrix2D create(double value);

  double determinant() const override;
  void translate2d(const Vector2D &translation);
  void scale2d(const Vector2D &scale);

  std::optional<Decomposed> decompose() const;
  static TransformMatrix2D recompose(const Decomposed &decomposed);

 private:
  Vector2D getTranslation() const;
  static std::pair<Vector2D, double> computeScaleAndSkew(std::array<Vector2D, 2> &rows);
  static double computeRotation(std::array<Vector2D, 2> &rows);
};

} // namespace reanimated::css
