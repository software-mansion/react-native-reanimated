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
  if (blended) {
    return blended->toDynamic();
  }
  return payload ? *payload : folly::dynamic();
}

std::string CSSPlatformColor::toString() const {
  if (blended) {
    return blended->toString();
  }
  return payload ? folly::toJson(*payload) : "";
}

CSSPlatformColor CSSPlatformColor::interpolate(
    const double progress,
    const CSSPlatformColor &to,
    const ValueInterpolationContext &context) const {
  // Both endpoints hold payloads here: a blended value only exists mid-flight
  // and never becomes an endpoint. Resolution is memoized, so past the first
  // frame this is a lookup, not a platform call.
  const auto fromChannels = payload ? resolvePlatformColor(*payload, context.node) : std::nullopt;
  const auto toChannels = to.payload ? resolvePlatformColor(*to.payload, context.node) : std::nullopt;
  if (!fromChannels || !toChannels) {
    return progress < context.fallbackInterpolateThreshold ? *this : to;
  }

  CSSPlatformColor result = progress < 0.5 ? *this : to;
  result.blended = CSSColor(*fromChannels).interpolate(progress, CSSColor(*toChannels));
  return result;
}

bool CSSPlatformColor::operator==(const CSSPlatformColor &other) const {
  if (blended != other.blended) {
    return false;
  }
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
