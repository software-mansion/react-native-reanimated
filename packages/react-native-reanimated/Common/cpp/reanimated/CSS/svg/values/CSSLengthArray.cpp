#include <reanimated/CSS/svg/values/CSSLengthArray.h>

#include <sstream>

namespace reanimated::css {

CSSLengthArray::CSSLengthArray(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  const auto &array = jsiValue.asObject(rt).asArray(rt);
  const auto arraySize = array.size(rt);
  lengths.reserve(arraySize);
  for (size_t i = 0; i < arraySize; ++i) {
    lengths.emplace_back(rt, array.getValueAtIndex(rt, i));
  }
}

CSSLengthArray::CSSLengthArray(const folly::dynamic &value) {
  lengths.reserve(value.size());
  for (const auto &item : value) {
    lengths.emplace_back(item);
  }
}

bool CSSLengthArray::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (!jsiValue.isObject() || !jsiValue.asObject(rt).isArray(rt)) {
    return false;
  }
  const auto &array = jsiValue.asObject(rt).asArray(rt);
  for (size_t i = 0; i < array.size(rt); ++i) {
    if (!CSSLength::canConstruct(rt, array.getValueAtIndex(rt, i))) {
      return false;
    }
  }
  return true;
}

bool CSSLengthArray::canConstruct(const folly::dynamic &value) {
  return value.isArray() &&
      std::all_of(value.begin(), value.end(), [](const auto &item) { return CSSLength::canConstruct(item); });
}

folly::dynamic CSSLengthArray::toDynamic() const {
  folly::dynamic array = folly::dynamic::array;
  array.reserve(lengths.size());
  for (const auto &length : lengths) {
    array.push_back(length.toDynamic());
  }
  return array;
}

std::string CSSLengthArray::toString() const {
  std::stringstream ss;
  ss << "[";
  for (const auto &length : lengths) {
    ss << length.toString();
    if (&length != &lengths.back()) {
      ss << ", ";
    }
  }
  ss << "]";
  return ss.str();
}

CSSLengthArray CSSLengthArray::interpolate(double progress, const CSSLengthArray &to) const {
  const auto &fromLengths = lengths;
  const auto &toLengths = to.lengths;

  if (fromLengths.empty() || toLengths.empty()) {
    return progress < 0.5 ? *this : to;
  }

  size_t fromSize = fromLengths.size();
  size_t toSize = toLengths.size();
  size_t longerSize = std::max(fromSize, toSize);

  std::vector<CSSLength> result;
  result.reserve(longerSize);

  for (size_t i = 0; i < longerSize; ++i) {
    double ratio = (longerSize > 1) ? static_cast<double>(i) / (static_cast<double>(longerSize) - 1.0) : 0.0;

    auto fromIdx = static_cast<size_t>(std::round(ratio * static_cast<double>(fromSize - 1)));
    auto toIdx = static_cast<size_t>(std::round(ratio * static_cast<double>(toSize - 1)));

    const auto &fromLen = fromLengths[fromIdx];
    const auto &toLen = toLengths[toIdx];

    double interpolatedValue = fromLen.value + (toLen.value - fromLen.value) * progress;
    bool isRelative = fromLen.isRelative || toLen.isRelative;

    result.emplace_back(interpolatedValue, isRelative);
  }

  return CSSLengthArray(std::move(result));
}

bool CSSLengthArray::operator==(const CSSLengthArray &other) const {
  return lengths == other.lengths;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSLengthArray &value) {
  os << "CSSLengthArray(" << value.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
