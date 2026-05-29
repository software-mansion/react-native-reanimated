#pragma once

#include <reanimated/CSS/svg/values/CSSLengthVector.h>

#include <vector>

namespace reanimated::css {

struct CSSLengthArray : public CSSLengthVector<CSSLengthArray> {
  // Defaults to a single zero; an empty list is also treated as zero.
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
