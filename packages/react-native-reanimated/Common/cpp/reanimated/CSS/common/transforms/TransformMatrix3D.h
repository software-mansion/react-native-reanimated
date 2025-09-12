#pragma once

#include <reanimated/CSS/common/transforms/Quaternion.h>
#include <reanimated/CSS/common/transforms/TransformMatrix.h>
#include <reanimated/CSS/common/transforms/TransformOp.h>
#include <reanimated/CSS/common/transforms/vectors.h>

#include <folly/dynamic.h>
#include <utility>

namespace reanimated::css {

namespace {
static constexpr size_t MATRIX_3D_DIMENSION = 4; // 4x4 matrix
}

class TransformMatrix3D
    : public TransformMatrixBase<TransformMatrix3D, MATRIX_3D_DIMENSION> {
 public:
  struct Decomposed {
    Vector3D scale;
    Vector3D skew;
    Quaternion quaternion;
    Vector3D translation;
    Vector4D perspective;

#ifndef NDEBUG
    friend std::ostream &operator<<(
        std::ostream &os,
        const Decomposed &decomposed);
#endif // NDEBUG

    Decomposed interpolate(double progress, const Decomposed &other) const;
  };

  using TransformMatrixBase<TransformMatrix3D, MATRIX_3D_DIMENSION>::
      TransformMatrixBase;

  static TransformMatrix3D Identity();

  template <TransformOp TOperation>
  static TransformMatrix3D create(double value);

  bool operator==(const TransformMatrix3D &other) const override;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformMatrix3D &matrix);
#endif // NDEBUG

  double determinant() const override;
  void adjugate();
  bool invert();
  void translate3d(const Vector3D &translation);
  void scale3d(const Vector3D &scale);

  std::optional<Decomposed> decompose() const;
  static TransformMatrix3D recompose(const Decomposed &decomposed);
  static TransformMatrix3D fromQuaternion(const Quaternion &q);

 private:
  std::optional<Vector4D> computePerspective() const;

  Vector3D getTranslation() const;
  static std::pair<Vector3D, Vector3D> computeScaleAndSkew(
      std::array<Vector3D, 3> &rows);
  static Quaternion computeQuaternion(std::array<Vector3D, 3> &columns);

  inline static double determinant3x3(
      double a,
      double b,
      double c,
      double d,
      double e,
      double f,
      double g,
      double h,
      double i);
};

Vector4D operator*(const Vector4D &v, const TransformMatrix3D &m);

} // namespace reanimated::css
