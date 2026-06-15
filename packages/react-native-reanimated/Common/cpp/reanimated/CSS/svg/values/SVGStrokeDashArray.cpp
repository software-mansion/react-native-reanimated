#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <numeric>
#include <vector>

namespace reanimated::css {

SVGStrokeDashArray SVGStrokeDashArray::interpolate(
    double progress,
    const SVGStrokeDashArray &to,
    const ResolvableValueInterpolationContext &context) const {
  std::vector<CSSLength> result;
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
    result.emplace_back(fromValues[i % fromSize].interpolate(progress, toValues[i % toSize], context));
  }

  return SVGStrokeDashArray(result);
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const SVGStrokeDashArray &strokeDashArray) {
  os << "SVGStrokeDashArray(" << strokeDashArray.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
