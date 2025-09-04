#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <folly/dynamic.h>
#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

class TransformMatrix {
 public:
  using Shared = std::shared_ptr<const TransformMatrix>;

  explicit TransformMatrix(size_t dimension);
  explicit TransformMatrix(
      jsi::Runtime &rt,
      const jsi::Value &value,
      size_t dimension);
  explicit TransformMatrix(const folly::dynamic &array, size_t dimension);

  virtual ~TransformMatrix() = default;

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &value);
  static bool canConstruct(const folly::dynamic &array);

  size_t getDimension() const;
  bool isSingular() const;
  bool normalize();
  void transpose();
  virtual double determinant() const = 0;

  std::string toString() const;
  folly::dynamic toDynamic() const;

  virtual double &operator[](size_t index) = 0;
  virtual const double &operator[](size_t index) const = 0;
  virtual bool operator==(const TransformMatrix &other) const = 0;

 protected:
  const size_t dimension_;
  const size_t size_;
};

template <typename TDerived, size_t TDimension>
class TransformMatrixBase : public TransformMatrix {
 public:
  static constexpr size_t SIZE = TDimension * TDimension;
  using MatrixArray = std::array<double, SIZE>;

  explicit TransformMatrixBase() : TransformMatrix(TDimension) {};
  explicit TransformMatrixBase(MatrixArray matrix)
      : matrix_(std::move(matrix)) {}
  explicit TransformMatrixBase(jsi::Runtime &rt, const jsi::Value &value)
      : TransformMatrix(rt, value, TDimension) {}
  explicit TransformMatrixBase(const folly::dynamic &array)
      : TransformMatrix(array, TDimension) {}

  inline bool operator==(const TDerived &other) const {
    return matrix_ == other.matrix_;
  }

  inline bool operator==(const TransformMatrix &other) const override {
    return TDimension == other.getDimension() &&
        matrix_ == static_cast<const TDerived &>(other).matrix_;
  }

  inline double &operator[](size_t index) override {
    return matrix_[index];
  }

  inline const double &operator[](size_t index) const override {
    return matrix_[index];
  }

  inline TDerived operator*(const TDerived &rhs) const {
    return TDerived(multiply(rhs));
  }

  inline TDerived &operator*=(const TDerived &rhs) {
    matrix_ = multiply(rhs);
    return static_cast<TDerived &>(*this);
  }

 protected:
  std::array<double, SIZE> matrix_;

  MatrixArray multiply(const TDerived &rhs) const {
    std::array<double, SIZE> result{};
    for (size_t i = 0; i < TDimension; ++i) {
      for (size_t j = 0; j < TDimension; ++j) {
        for (size_t k = 0; k < TDimension; ++k) {
          result[i * TDimension + j] +=
              matrix_[i * TDimension + k] * rhs[k * TDimension + j];
        }
      }
    }
    return result;
  }
};

} // namespace reanimated::css
