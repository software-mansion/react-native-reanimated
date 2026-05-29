#include <reanimated/CSS/svg/values/CSSLengthArray.h>
#include <reanimated/CSS/svg/values/CSSLengthVector.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <algorithm>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

template <typename Derived>
CSSLengthVector<Derived>::CSSLengthVector(std::vector<CSSLength> values) : values(std::move(values)) {}

template <typename Derived>
CSSLengthVector<Derived>::CSSLengthVector(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  const auto array = jsiValue.asObject(rt).asArray(rt);
  const auto size = array.size(rt);
  values.reserve(size);
  for (size_t i = 0; i < size; ++i) {
    values.emplace_back(rt, array.getValueAtIndex(rt, i));
  }
}

template <typename Derived>
CSSLengthVector<Derived>::CSSLengthVector(const folly::dynamic &value) {
  values.reserve(value.size());
  for (const auto &item : value) {
    values.emplace_back(item);
  }
}

template <typename Derived>
bool CSSLengthVector<Derived>::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (!jsiValue.isObject() || !jsiValue.asObject(rt).isArray(rt)) {
    return false;
  }
  const auto array = jsiValue.asObject(rt).asArray(rt);
  const auto size = array.size(rt);
  for (size_t i = 0; i < size; ++i) {
    if (!CSSLength::canConstruct(rt, array.getValueAtIndex(rt, i))) {
      return false;
    }
  }
  return true;
}

template <typename Derived>
bool CSSLengthVector<Derived>::canConstruct(const folly::dynamic &value) {
  return value.isArray() &&
      std::all_of(value.begin(), value.end(), [](const auto &item) { return CSSLength::canConstruct(item); });
}

template <typename Derived>
folly::dynamic CSSLengthVector<Derived>::toDynamic() const {
  folly::dynamic array = folly::dynamic::array;
  array.reserve(values.size());
  for (const auto &length : values) {
    array.push_back(length.toDynamic());
  }
  return array;
}

template <typename Derived>
std::string CSSLengthVector<Derived>::toString() const {
  std::stringstream ss;
  ss << '[';
  for (size_t i = 0; i < values.size(); ++i) {
    if (i > 0) {
      ss << ", ";
    }
    ss << values[i].toString();
  }
  ss << ']';
  return ss.str();
}

template <typename Derived>
bool CSSLengthVector<Derived>::operator==(const CSSLengthVector &other) const {
  return values == other.values;
}

template struct CSSLengthVector<CSSLengthArray>;
template struct CSSLengthVector<SVGStrokeDashArray>;

} // namespace reanimated::css
