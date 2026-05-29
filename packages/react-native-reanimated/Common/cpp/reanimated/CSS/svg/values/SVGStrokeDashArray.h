#pragma once

#include <reanimated/CSS/svg/values/CSSLengthVector.h>

namespace reanimated::css {

struct SVGStrokeDashArray : public CSSLengthVector<SVGStrokeDashArray> {
  using CSSLengthVector::CSSLengthVector;

  SVGStrokeDashArray interpolate(
      double progress,
      const SVGStrokeDashArray &to,
      const ResolvableValueInterpolationContext &context) const override;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const SVGStrokeDashArray &strokeDashArray);
#endif // NDEBUG
};

} // namespace reanimated::css
