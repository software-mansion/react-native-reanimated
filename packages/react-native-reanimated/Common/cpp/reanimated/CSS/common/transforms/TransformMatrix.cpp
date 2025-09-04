#include <reanimated/CSS/common/transforms/TransformMatrix.h>

namespace reanimated::css {

TransformMatrix::TransformMatrix(const size_t dimension)
    : dimension_(dimension), size_(dimension * dimension) {
  // Create an identity matrix
  for (size_t i = 0; i < dimension_; ++i) {
    (*this)[i * (dimension_ + 1)] = 1;
  }
}

TransformMatrix::TransformMatrix(
    jsi::Runtime &rt,
    const jsi::Value &value,
    size_t dimension)
    : dimension_(dimension), size_(dimension * dimension) {
  const auto &array = value.asObject(rt).asArray(rt);
  for (size_t i = 0; i < size_; ++i) {
    (*this)[i] = array.getValueAtIndex(rt, i).asNumber();
  }
}

TransformMatrix::TransformMatrix(const folly::dynamic &array, size_t dimension)
    : dimension_(dimension), size_(dimension * dimension) {
  for (size_t i = 0; i < size_; ++i) {
    (*this)[i] = array[i].asDouble();
  }
}

bool TransformMatrix::canConstruct(jsi::Runtime &rt, const jsi::Value &value) {
  if (!value.isObject()) {
    return false;
  }
  const auto &obj = value.asObject(rt);
  if (!obj.isArray(rt)) {
    return false;
  }
  return obj.asArray(rt).size(rt) == size_;
}

bool TransformMatrix::canConstruct(const folly::dynamic &array) {
  return array.isArray() && array.size() == size_;
}

size_t TransformMatrix::getDimension() const {
  return dimension_;
}

bool TransformMatrix::isSingular() const {
  return determinant() == 0;
}

bool TransformMatrix::normalize() {
  const auto last = (*this)[size_ - 1];
  if (last == 0) {
    return false;
  }
  if (last == 1) {
    return true;
  }

  for (size_t i = 0; i < size_; ++i) {
    (*this)[i] /= last;
  }
  return true;
}

void TransformMatrix::transpose() {
  for (size_t i = 0; i < dimension_; ++i) {
    for (size_t j = 0; j < dimension_; ++j) {
      (*this)[i * dimension_ + j] = (*this)[j * dimension_ + i];
    }
  }
}

std::string TransformMatrix::toString() const {
  std::string result = "[";
  for (size_t i = 0; i < size_; ++i) {
    result += std::to_string((*this)[i]);
    if (i < size_ - 1) {
      result += ", ";
    }
  }
  result += "]";
  return result;
}

folly::dynamic TransformMatrix::toDynamic() const {
  folly::dynamic result = folly::dynamic::array;
  for (size_t i = 0; i < size_; ++i) {
    result.push_back((*this)[i]);
  }
  return result;
}

} // namespace reanimated::css
