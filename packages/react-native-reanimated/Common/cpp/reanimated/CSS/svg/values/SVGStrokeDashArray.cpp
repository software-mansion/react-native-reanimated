#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

namespace reanimated::css {

SVGStrokeDashArray::SVGStrokeDashArray() : values() {}

SVGStrokeDashArray::SVGStrokeDashArray(const std::vector<SVGLength> &values)
    : values(values) {}

SVGStrokeDashArray::SVGStrokeDashArray(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  const auto &array = jsiValue.asObject(rt).asArray(rt);
  const auto arraySize = array.size(rt);
  values.reserve(arraySize);
  for (size_t i = 0; i < arraySize; ++i) {
    values.emplace_back(rt, array.getValueAtIndex(rt, i));
  }
}

SVGStrokeDashArray::SVGStrokeDashArray(const folly::dynamic &value) {
  for (const auto &value : value) {
    values.emplace_back(value);
  }
}

bool SVGStrokeDashArray::canConstruct(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  if (!jsiValue.isObject() || !jsiValue.asObject(rt).isArray(rt)) {
    return false;
  }
  const auto &array = jsiValue.asObject(rt).asArray(rt);
  for (size_t i = 0; i < array.size(rt); ++i) {
    if (!SVGLength::canConstruct(rt, array.getValueAtIndex(rt, i))) {
      return false;
    }
  }
  return true;
}

bool SVGStrokeDashArray::canConstruct(const folly::dynamic &value) {
  return value.isArray() &&
      std::all_of(value.begin(), value.end(), [](const auto &value) {
           return SVGLength::canConstruct(value);
         });
}

folly::dynamic SVGStrokeDashArray::toDynamic() const {
  folly::dynamic array = folly::dynamic::array;
  array.reserve(values.size());
  for (const auto &value : values) {
    array.push_back(value.toDynamic());
  }
  return array;
}

std::string SVGStrokeDashArray::toString() const {
  std::stringstream ss;
  ss << "{";
  for (const auto &value : values) {
    ss << value.toString();
    if (&value != &values.back()) {
      ss << ", ";
    }
  }
  ss << "}";
  return ss.str();
}

SVGStrokeDashArray SVGStrokeDashArray::interpolate(
    double progress,
    const SVGStrokeDashArray &to) const {
  std::vector<SVGLength> result;
  auto fromValues = values;
  auto toValues = to.values;

  // If one of the arrays is empty, we take the fist value from the second
  // one and put it as the only element of the first (empty) array
  // (this is how it works on the web)
  if (fromValues.size() == 0 && toValues.size() > 0) {
    fromValues = {toValues[0]};
  }
  if (toValues.size() == 0 && fromValues.size() > 0) {
    toValues = {fromValues[0]};
  }

  const auto fromSize = fromValues.size();
  const auto toSize = toValues.size();

  // We need to find the least common multiple of the two arrays to get
  // a smooth interpolation of the dash array pattern
  const auto resultSize = std::lcm(fromSize, toSize);
  result.reserve(resultSize);

  for (size_t i = 0; i < resultSize; i++) {
    result.emplace_back(
        fromValues[i % fromSize].interpolate(progress, toValues[i % toSize]));
  }

  return SVGStrokeDashArray(result);
}

bool SVGStrokeDashArray::operator==(const SVGStrokeDashArray &other) const {
  return values == other.values;
}

#ifndef NDEBUG

std::ostream &operator<<(
    std::ostream &os,
    const SVGStrokeDashArray &strokeDashArray) {
  os << "SVGStrokeDashArray(" << strokeDashArray.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
