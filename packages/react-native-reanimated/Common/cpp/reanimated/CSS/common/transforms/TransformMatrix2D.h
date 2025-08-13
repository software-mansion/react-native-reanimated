#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/transforms/DecomposedTransform.h>
#include <reanimated/CSS/common/transforms/TransformMatrix.h>
#include <reanimated/CSS/common/vectors.h>

#include <folly/dynamic.h>

namespace reanimated::css {

class TransformMatrix2D : public TransformMatrix<
                              TransformMatrix2D,
                              Vec9Array,
                              TransformMatrix2D::Decomposed> {
 public:
  struct Decomposed
      : public DecomposedTransform<Decomposed, TransformMatrix2D> {
    Vector2D scale;
    Vector2D skew;
    double rotation;
    Vector2D translation;

#ifndef NDEBUG
    friend std::ostream &operator<<(
        std::ostream &os,
        const Decomposed &decomposed);
#endif // NDEBUG

    Decomposed interpolate(double progress, const Decomposed &other)
        const override;
    TransformMatrix2D recompose() const override;
  };

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
  bool operator==(const TransformMatrix2D &other) const override;
  TransformMatrix2D operator*(const TransformMatrix2D &rhs) const override;
  TransformMatrix2D operator*=(const TransformMatrix2D &rhs) override;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformMatrix2D &matrix);
  std::ostream &print(std::ostream &os) const override;
#endif // NDEBUG

  std::string toString() const override;
  folly::dynamic toDynamic() const override;
  std::optional<Decomposed> decompose() const override;

 private:
  Vec9Array matrix_;
};

} // namespace reanimated::css
