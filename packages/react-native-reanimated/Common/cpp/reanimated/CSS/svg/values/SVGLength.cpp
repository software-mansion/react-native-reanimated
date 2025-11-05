#include <reanimated/CSS/svg/values/SVGLength.h>

#include <string>

namespace reanimated::css {

SVGLength::SVGLength() : value(0), isPercentage(false) {}

SVGLength::SVGLength(const double value) : value(value), isPercentage(false) {}

SVGLength::SVGLength(const double value, const bool isPercentage) : value(value), isPercentage(isPercentage) {}

SVGLength::SVGLength(const char *value) {
  if (!canConstruct(value)) {
    throw std::invalid_argument("[Reanimated] SVGLength: Invalid value: " + std::string(value));
  }

  std::string str = value;
  str.pop_back();
  this->value = std::stod(str) / 100;
  this->isPercentage = true;
}

SVGLength::SVGLength(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (jsiValue.isNumber()) {
    this->value = jsiValue.asNumber();
    this->isPercentage = false;
  } else {
    *this = SVGLength(jsiValue.asString(rt).utf8(rt));
  }
}

SVGLength::SVGLength(const folly::dynamic &value) {
  if (value.isNumber()) {
    this->value = value.getDouble();
    this->isPercentage = false;
  } else {
    *this = SVGLength(value.asString().c_str());
  }
}

bool SVGLength::canConstruct(const std::string &value) {
  return !value.empty() && value.back() == '%';
}

bool SVGLength::canConstruct(const char *value) {
  return canConstruct(std::string(value));
}

bool SVGLength::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return jsiValue.isNumber() || (jsiValue.isString() && canConstruct(jsiValue.getString(rt).utf8(rt)));
}

bool SVGLength::canConstruct(const folly::dynamic &value) {
  return value.isNumber() || (value.isString() && canConstruct(value.getString()));
}

folly::dynamic SVGLength::toDynamic() const {
  if (isPercentage) {
    return std::to_string(value * 100) + "%";
  }
  return value;
}

std::string SVGLength::toString() const {
  return std::to_string(value * (isPercentage ? 100 : 1)) + "%";
}

SVGLength SVGLength::interpolate(const double progress, const SVGLength &to) const {
  // We can interpolate SVG length values only if both values are percentages or
  // both are numbers. In other cases, we interpolate them as keywords.
  if ((isPercentage == to.isPercentage) || (isPercentage && to.value == 0) || (to.isPercentage && value == 0)) {
    return SVGLength(value + (to.value - value) * progress, isPercentage || to.isPercentage);
  }

  // Otherwise, we interpolate values as discrete values
  return progress < 0.5 ? *this : to;
}

bool SVGLength::operator==(const SVGLength &other) const {
  return value == other.value && isPercentage == other.isPercentage;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const SVGLength &value) {
  os << "SVGLength(" << value.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
