#include <reanimated/CSS/svg/values/CSSLengthArray.h>

#include <algorithm>
#include <cmath>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSLengthArray CSSLengthArray::interpolate(
    double progress,
    const CSSLengthArray &to,
    const ResolvableValueInterpolationContext &context) const {
  // Treat an empty list as a single zero.
  static const std::vector<CSSLength> fallback{CSSLength(0.0)};
  const auto &fromLengths = values.empty() ? fallback : values;
  const auto &toLengths = to.values.empty() ? fallback : to.values;

  size_t fromSize = fromLengths.size();
  size_t toSize = toLengths.size();
  size_t longerSize = std::max(fromSize, toSize);

  std::vector<CSSLength> result;
  result.reserve(longerSize);

  for (size_t i = 0; i < longerSize; ++i) {
    double ratio = (longerSize > 1) ? static_cast<double>(i) / (longerSize - 1.0) : 0.0;

    auto fromIdx = static_cast<size_t>(std::round(ratio * (fromSize - 1)));
    auto toIdx = static_cast<size_t>(std::round(ratio * (toSize - 1)));

    result.emplace_back(fromLengths[fromIdx].interpolate(progress, toLengths[toIdx], context));
  }

  return CSSLengthArray(std::move(result));
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSLengthArray &value) {
  os << "CSSLengthArray(" << value.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
