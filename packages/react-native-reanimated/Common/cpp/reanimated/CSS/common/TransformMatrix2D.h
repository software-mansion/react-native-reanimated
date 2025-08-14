#pragma once

#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/common/vectors.h>

#include <folly/dynamic.h>

namespace reanimated::css {

namespace {
static constexpr size_t SIZE = 9;
}

class TransformMatrix2D : public TransformMatrixBase<SIZE> {
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

  using TransformMatrixBase<SIZE>::TransformMatrixBase;

  static TransformMatrix2D Identity();
  static TransformMatrix2D Rotate(double value);
  static TransformMatrix2D Scale(double value);
  static TransformMatrix2D ScaleX(double value);
  static TransformMatrix2D ScaleY(double value);
  static TransformMatrix2D TranslateX(double value);
  static TransformMatrix2D TranslateY(double value);
  static TransformMatrix2D SkewX(double value);
  static TransformMatrix2D SkewY(double value);

  bool operator==(const TransformMatrix2D &other) const;
  TransformMatrix2D operator*(const TransformMatrix2D &rhs) const;
  TransformMatrix2D operator*=(const TransformMatrix2D &rhs);
};

} // namespace reanimated::css
