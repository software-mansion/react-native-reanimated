#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <folly/dynamic.h>
#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

class TransformMatrix {
 public:
  virtual ~TransformMatrix() = default;

  virtual double determinant() const = 0;

  virtual double &operator[](size_t index) = 0;
  virtual const double &operator[](size_t index) const = 0;

  virtual size_t getDimension() const = 0;

  virtual std::string toString() const = 0;
  virtual folly::dynamic toDynamic() const = 0;
};

template <typename TDerived, size_t TDimension>
class TransformMatrixBase : public TransformMatrix {
 public:
  static constexpr size_t SIZE = TDimension * TDimension;
  using MatrixArray = std::array<double, SIZE>;

  explicit TransformMatrixBase(MatrixArray matrix)
      : matrix_(std::move(matrix)) {}

  explicit TransformMatrixBase(jsi::Runtime &rt, const jsi::Value &value) {
    const auto array = value.asObject(rt).asArray(rt);
    if (array.size(rt) != SIZE) {
      throw std::invalid_argument(
          "[Reanimated] Matrix array should have " + std::to_string(SIZE) +
          " elements");
    }

    for (size_t i = 0; i < SIZE; ++i) {
      matrix_[i] = array.getValueAtIndex(rt, i).asNumber();
    }
  }

  explicit TransformMatrixBase(const folly::dynamic &array) {
    if (!array.isArray() || array.size() != SIZE) {
      throw std::invalid_argument(
          "[Reanimated] Matrix array should have " + std::to_string(SIZE) +
          " elements");
    }

    for (size_t i = 0; i < SIZE; ++i) {
      matrix_[i] = array[i].asDouble();
    }
  }

  virtual bool operator==(const TDerived &other) const = 0;

  double &operator[](size_t index) override {
    return matrix_[index];
  }

  const double &operator[](size_t index) const override {
    return matrix_[index];
  }

  TDerived operator*(const TDerived &rhs) const {
    return TDerived(multiply(rhs));
  }

  TDerived &operator*=(const TDerived &rhs) {
    matrix_ = multiply(rhs);
    return static_cast<TDerived &>(*this);
  }

  std::string toString() const override {
    std::string result = "[";
    for (size_t i = 0; i < SIZE; ++i) {
      result += std::to_string(matrix_[i]);
      if (i < SIZE - 1) {
        result += ", ";
      }
    }
    result += "]";
    return result;
  }

  folly::dynamic toDynamic() const override {
    folly::dynamic result = folly::dynamic::array;
    for (size_t i = 0; i < SIZE; ++i) {
      result.push_back(matrix_[i]);
    }
    return result;
  }

  size_t getDimension() const override {
    return TDimension;
  }

  bool isSingular() const {
    return determinant() == 0;
  }

  bool normalize() {
    const auto last = matrix_[SIZE - 1];
    if (last == 0) {
      return false;
    }
    if (last == 1) {
      return true;
    }

    for (size_t i = 0; i < SIZE; ++i) {
      matrix_[i] /= last;
    }
    return true;
  }

  void transpose() {
    for (size_t i = 0; i < TDimension; ++i) {
      for (size_t j = i + 1; j < TDimension; ++j) {
        std::swap(matrix_[i * TDimension + j], matrix_[j * TDimension + i]);
      }
    }
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
