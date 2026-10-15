#include <reanimated/CSS/svg/values/SVGPlatformBrush.h>

#include <string>

namespace reanimated::css {

namespace {

const folly::dynamic &unwrapBrush(const folly::dynamic &value) {
  if (value.isObject()) {
    const auto *type = value.get_ptr("type");
    const auto *payload = value.get_ptr("payload");
    if (type != nullptr && type->isNumber() && type->asInt() == 0 && payload != nullptr) {
      return *payload;
    }
  }
  return value;
}

jsi::Value unwrapBrush(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isObject()) {
    const auto object = value.getObject(rt);
    const auto type = object.getProperty(rt, "type");
    if (type.isNumber() && type.getNumber() == 0) {
      return object.getProperty(rt, "payload");
    }
  }
  return jsi::Value(rt, value);
}

} // namespace

SVGPlatformBrush::SVGPlatformBrush(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : color(rt, unwrapBrush(rt, jsiValue)) {}

SVGPlatformBrush::SVGPlatformBrush(const folly::dynamic &value) : color(unwrapBrush(value)) {}

bool SVGPlatformBrush::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return CSSPlatformColor::canConstruct(rt, unwrapBrush(rt, jsiValue));
}

bool SVGPlatformBrush::canConstruct(const folly::dynamic &value) {
  return CSSPlatformColor::canConstruct(unwrapBrush(value));
}

folly::dynamic SVGPlatformBrush::toDynamic() const {
  return folly::dynamic::object("type", 0)("payload", color.toDynamic());
}

std::string SVGPlatformBrush::toString() const {
  return color.toString();
}

bool SVGPlatformBrush::canInterpolateTo(const SVGPlatformBrush & /*to*/) const {
  return false;
}

SVGPlatformBrush SVGPlatformBrush::interpolate(const double progress, const SVGPlatformBrush &to) const {
  // Never called while canInterpolateTo() is false.
  return progress < 0.5 ? *this : to;
}

bool SVGPlatformBrush::operator==(const SVGPlatformBrush &other) const {
  return color == other.color;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const SVGPlatformBrush &brush) {
  os << "SVGPlatformBrush(" << brush.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
