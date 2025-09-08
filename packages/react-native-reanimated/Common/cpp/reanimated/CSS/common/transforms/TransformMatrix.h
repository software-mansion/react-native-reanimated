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

  TransformMatrix() = default;
  virtual ~TransformMatrix() = default;

  virtual size_t getDimension() const = 0;
  virtual size_t getSize() const = 0;

  virtual bool isSingular() const = 0;
  virtual bool normalize() = 0;
  virtual void transpose() = 0;
  virtual double determinant() const = 0;

  virtual std::string toString() const = 0;
  virtual folly::dynamic toDynamic() const = 0;

  virtual double &operator[](size_t index) = 0;
  virtual const double &operator[](size_t index) const = 0;
  virtual bool operator==(const TransformMatrix &other) const = 0;
};

template <typename TDerived, size_t TDimension>
class TransformMatrixBase : public TransformMatrix {
 public:
  static constexpr size_t SIZE = TDimension * TDimension;
  using MatrixArray = std::array<double, SIZE>;

  TransformMatrixBase() : TransformMatrix(), matrix_{} {
    // Create an identity matrix
    for (size_t i = 0; i < TDimension; ++i) {
      matrix_[i * (TDimension + 1)] = 1;
    }
  }

  explicit TransformMatrixBase(MatrixArray matrix)
      : TransformMatrix(), matrix_(std::move(matrix)) {}

  explicit TransformMatrixBase(jsi::Runtime &rt, const jsi::Value &value)
      : TransformMatrix() {
    const auto &array = value.asObject(rt).asArray(rt);
    for (size_t i = 0; i < SIZE; ++i) {
      matrix_[i] = array.getValueAtIndex(rt, i).asNumber();
    }
  }

  explicit TransformMatrixBase(const folly::dynamic &array)
      : TransformMatrix() {
    for (size_t i = 0; i < SIZE; ++i) {
      matrix_[i] = array[i].asDouble();
    }
  }

  TransformMatrixBase(const TransformMatrixBase &other)
      : TransformMatrix(), matrix_(other.matrix_) {}

  TransformMatrixBase(TransformMatrixBase &&other) noexcept
      : TransformMatrix(), matrix_(std::move(other.matrix_)) {}

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &value) {
    if (!value.isObject()) {
      return false;
    }
    const auto &obj = value.asObject(rt);
    if (!obj.isArray(rt)) {
      return false;
    }
    return obj.asArray(rt).size(rt) == SIZE;
  }

  static bool canConstruct(const folly::dynamic &array) {
    return array.isArray() && array.size() == SIZE;
  }

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

  size_t getDimension() const override {
    return TDimension;
  }

  size_t getSize() const override {
    return SIZE;
  }

  bool isSingular() const override {
    return determinant() == 0;
  }

  bool normalize() override {
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

  void transpose() override {
    for (size_t i = 0; i < TDimension; ++i) {
      for (size_t j = i + 1; j < TDimension; ++j) {
        std::swap(matrix_[i * TDimension + j], matrix_[j * TDimension + i]);
      }
    }
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

  inline TDerived operator*(const TDerived &rhs) const {
    return TDerived(multiply(rhs));
  }

  inline TDerived &operator*=(const TDerived &rhs) {
    matrix_ = multiply(rhs);
    return static_cast<TDerived &>(*this);
  }

  TransformMatrixBase &operator=(const TransformMatrixBase &other) {
    if (this != &other) {
      // Note: dimension_ is const, so we can't reassign it
      // But since all instances have the same dimension, this is fine
      matrix_ = other.matrix_;
    }
    return *this;
  }

  TransformMatrixBase &operator=(TransformMatrixBase &&other) noexcept {
    if (this != &other) {
      matrix_ = std::move(other.matrix_);
    }
    return *this;
  }

 protected:
  std::array<double, SIZE> matrix_;

  MatrixArray multiply(const TDerived &rhs) const {
    MatrixArray result{};

    for (size_t i = 0; i < TDimension; ++i) {
      for (size_t k = 0; k < TDimension; ++k) {
        double temp = matrix_[i * TDimension + k];
        for (size_t j = 0; j < TDimension; ++j) {
          result[i * TDimension + j] += temp * rhs[k * TDimension + j];
        }
      }
    }

    return result;
  }
};

} // namespace reanimated::css
