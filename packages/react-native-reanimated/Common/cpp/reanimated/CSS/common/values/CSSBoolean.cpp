#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSBoolean.h>

namespace reanimated {

CSSBoolean::CSSBoolean() : value(false) {}

CSSBoolean::CSSBoolean(bool value) : value(value) {}

CSSBoolean::CSSBoolean(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : value(jsiValue.asBool()) {}

bool CSSBoolean::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return jsiValue.isBool();
}

jsi::Value CSSBoolean::toJSIValue(jsi::Runtime &rt) const {
  return {value};
}

folly::dynamic CSSBoolean::toDynamic() const {
  return {value};
}

std::string CSSBoolean::toString() const {
  return value ? "true" : "false";
}

CSSBoolean CSSBoolean::interpolate(double progress, const CSSBoolean &to)
    const {
  return CSSBoolean(progress < 0.5 ? value : to.value);
}

bool CSSBoolean::operator==(const CSSBoolean &other) const {
  return value == other.value;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSBoolean &boolValue) {
  os << boolValue.toString();
  return os;
}

#endif // NDEBUG

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
