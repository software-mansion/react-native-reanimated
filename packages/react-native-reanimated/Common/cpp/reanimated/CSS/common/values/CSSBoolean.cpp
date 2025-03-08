#include <reanimated/CSS/common/values/CSSBoolean.h>

namespace reanimated::css {

CSSBoolean::CSSBoolean() : value(false) {}

CSSBoolean::CSSBoolean(bool value) : value(value) {}

CSSBoolean::CSSBoolean(jsi::Runtime &rt, const jsi::Value &jsiValue)
    : value(jsiValue.asBool()) {}

CSSBoolean::CSSBoolean(const folly::dynamic &value) : value(value.asBool()) {}

bool CSSBoolean::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return jsiValue.isBool();
}

bool CSSBoolean::canConstruct(const folly::dynamic &value) {
  return value.isBool();
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

} // namespace reanimated::css
