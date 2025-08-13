#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <folly/dynamic.h>

namespace reanimated::css {

class TransformMatrix2D {
 public:
  explicit TransformMatrix2D(const Vec9Array &matrix);
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

  std::array<double, 3> &operator[](size_t rowIdx);
  const std::array<double, 3> &operator[](size_t rowIdx) const;
  bool operator==(const TransformMatrix2D &other) const;
  TransformMatrix2D operator*(const TransformMatrix2D &rhs) const;
  TransformMatrix2D operator*=(const TransformMatrix2D &rhs);

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformMatrix2D &matrix);
#endif // NDEBUG

  std::string toString() const;
  folly::dynamic toDynamic() const;

 private:
  Vec9Array matrix_;
};

} // namespace reanimated::css
