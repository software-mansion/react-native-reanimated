#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/vectors.h>

#include <folly/dynamic.h>

namespace reanimated::css {

class TransformMatrix2D {
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

  explicit TransformMatrix2D(Vec9Array matrix);
  explicit TransformMatrix2D(jsi::Runtime &rt, const jsi::Value &value);
  explicit TransformMatrix2D(const folly::dynamic &value);

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

 private:
  Vec9Array matrix_;
};

} // namespace reanimated::css
