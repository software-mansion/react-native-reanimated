#include <reanimated/CSS/common/transforms/TransformMatrix.h>

#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>

#include <algorithm>
#include <string>
#include <utility>

namespace reanimated::css {

// TransformMatrixBase template implementations
template <typename TDerived, size_t TDimension>
TransformMatrixBase<TDerived, TDimension>::TransformMatrixBase() : TransformMatrix(), matrix_{} {
  // Create an identity matrix
  for (size_t i = 0; i < TDimension; ++i) {
    matrix_[i * (TDimension + 1)] = 1;
  }
}

template <typename TDerived, size_t TDimension>
TransformMatrixBase<TDerived, TDimension>::TransformMatrixBase(MatrixArray matrix)
    : TransformMatrix(), matrix_(std::move(matrix)) {}

template <typename TDerived, size_t TDimension>
TransformMatrixBase<TDerived, TDimension>::TransformMatrixBase(const TransformMatrixBase &other)
    : TransformMatrix(), matrix_(other.matrix_) {}

template <typename TDerived, size_t TDimension>
TransformMatrixBase<TDerived, TDimension>::TransformMatrixBase(TransformMatrixBase &&other) noexcept
    : TransformMatrix(), matrix_(std::move(other.matrix_)) {}

template <typename TDerived, size_t TDimension>
bool TransformMatrixBase<TDerived, TDimension>::operator==(const TDerived &other) const {
  return matrix_ == other.matrix_;
}

template <typename TDerived, size_t TDimension>
bool TransformMatrixBase<TDerived, TDimension>::operator==(const TransformMatrix &other) const {
  return TDimension == other.getDimension() && matrix_ == static_cast<const TDerived &>(other).matrix_;
}

template <typename TDerived, size_t TDimension>
double &TransformMatrixBase<TDerived, TDimension>::operator[](size_t index) {
  return matrix_[index];
}

template <typename TDerived, size_t TDimension>
const double &TransformMatrixBase<TDerived, TDimension>::operator[](size_t index) const {
  return matrix_[index];
}

template <typename TDerived, size_t TDimension>
size_t TransformMatrixBase<TDerived, TDimension>::getDimension() const {
  return TDimension;
}

template <typename TDerived, size_t TDimension>
size_t TransformMatrixBase<TDerived, TDimension>::getSize() const {
  return SIZE;
}

template <typename TDerived, size_t TDimension>
bool TransformMatrixBase<TDerived, TDimension>::isSingular() const {
  return determinant() == 0;
}

template <typename TDerived, size_t TDimension>
bool TransformMatrixBase<TDerived, TDimension>::normalize() {
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

template <typename TDerived, size_t TDimension>
void TransformMatrixBase<TDerived, TDimension>::transpose() {
  for (size_t i = 0; i < TDimension; ++i) {
    for (size_t j = i + 1; j < TDimension; ++j) {
      std::swap(matrix_[i * TDimension + j], matrix_[j * TDimension + i]);
    }
  }
}

template <typename TDerived, size_t TDimension>
std::string TransformMatrixBase<TDerived, TDimension>::toString() const {
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

template <typename TDerived, size_t TDimension>
folly::dynamic TransformMatrixBase<TDerived, TDimension>::toDynamic() const {
  folly::dynamic result = folly::dynamic::array;
  for (size_t i = 0; i < SIZE; ++i) {
    result.push_back(matrix_[i]);
  }
  return result;
}

template <typename TDerived, size_t TDimension>
TDerived TransformMatrixBase<TDerived, TDimension>::operator*(const TDerived &rhs) const {
  return TDerived(multiply(rhs));
}

template <typename TDerived, size_t TDimension>
TDerived &TransformMatrixBase<TDerived, TDimension>::operator*=(const TDerived &rhs) {
  matrix_ = multiply(rhs);
  return static_cast<TDerived &>(*this);
}

template <typename TDerived, size_t TDimension>
TransformMatrixBase<TDerived, TDimension> &TransformMatrixBase<TDerived, TDimension>::operator=(
    const TransformMatrixBase &other) {
  if (this != &other) {
    // Note: dimension_ is const, so we can't reassign it
    // But since all instances have the same dimension, this is fine
    matrix_ = other.matrix_;
  }
  return *this;
}

template <typename TDerived, size_t TDimension>
TransformMatrixBase<TDerived, TDimension> &TransformMatrixBase<TDerived, TDimension>::operator=(
    TransformMatrixBase &&other) noexcept {
  if (this != &other) {
    matrix_ = std::move(other.matrix_);
  }
  return *this;
}

template <typename TDerived, size_t TDimension>
typename TransformMatrixBase<TDerived, TDimension>::MatrixArray TransformMatrixBase<TDerived, TDimension>::multiply(
    const TDerived &rhs) const {
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

template class TransformMatrixBase<TransformMatrix2D, MATRIX_2D_DIMENSION>;
template class TransformMatrixBase<TransformMatrix3D, MATRIX_3D_DIMENSION>;

} // namespace reanimated::css
