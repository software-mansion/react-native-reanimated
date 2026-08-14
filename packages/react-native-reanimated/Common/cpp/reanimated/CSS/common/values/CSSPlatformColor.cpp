#include <reanimated/CSS/common/values/CSSPlatformColor.h>
#include <reanimated/CSS/utils/platformColor.h>

#include <folly/json.h>
#include <jsi/JSIDynamic.h>

#include <utility>

namespace reanimated::css {

CSSPlatformColor::CSSPlatformColor(const folly::dynamic &value)
    : payload(std::make_shared<const folly::dynamic>(value)) {}

CSSPlatformColor::CSSPlatformColor(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : CSSPlatformColor(jsi::dynamicFromValue(rt, jsiValue)) {}

bool CSSPlatformColor::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return isPlatformColorPayload(rt, jsiValue);
}

bool CSSPlatformColor::canConstruct(const folly::dynamic &value) {
  return isPlatformColorPayload(value);
}

folly::dynamic CSSPlatformColor::toDynamic() const {
  return payload ? *payload : folly::dynamic();
}

std::string CSSPlatformColor::toString() const {
  return payload ? folly::toJson(*payload) : "";
}

bool CSSPlatformColor::canInterpolateTo(const CSSPlatformColor & /*to*/) const {
  // Blending needs the payload resolved against the animated view, which isn't
  // implemented yet, so the variant switches over instead - the same thing it
  // does for a platform color paired with a plain one.
  return false;
}

CSSPlatformColor CSSPlatformColor::interpolate(
    const double progress,
    const CSSPlatformColor &to,
    const ValueInterpolationContext &context) const {
  return progress < context.fallbackInterpolateThreshold ? *this : to;
}

bool CSSPlatformColor::operator==(const CSSPlatformColor &other) const {
  if (!payload || !other.payload) {
    return payload == other.payload;
  }
  return *payload == *other.payload;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSPlatformColor &color) {
  os << "CSSPlatformColor(" << color.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
