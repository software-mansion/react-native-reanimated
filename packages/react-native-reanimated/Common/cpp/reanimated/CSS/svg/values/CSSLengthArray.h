#pragma once

#include <reanimated/CSS/svg/values/CSSLengthVector.h>

#include <vector>

namespace reanimated::css {

struct CSSLengthArray : public CSSLengthVector<CSSLengthArray> {
  static constexpr char kOpenBracket = '[';
  static constexpr char kCloseBracket = ']';

  // The default value is a single zero so that "to"-only animations
  // interpolate from 0. An explicitly empty list is also accepted and treated
  // as zero by `interpolate`.
  CSSLengthArray() : CSSLengthVector(std::vector<CSSLength>{CSSLength(0.0)}) {}
  using CSSLengthVector::CSSLengthVector;

  CSSLengthArray interpolate(
      double progress,
      const CSSLengthArray &to,
      const ResolvableValueInterpolationContext &context) const override;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSLengthArray &value);
#endif // NDEBUG
};

} // namespace reanimated::css
