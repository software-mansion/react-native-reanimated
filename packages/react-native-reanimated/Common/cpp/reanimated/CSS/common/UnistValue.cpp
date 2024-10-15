#include <reanimated/CSS/common/UnitValue.h>

namespace reanimated {

UnitValue::UnitValue() : value(0), isRelative(false) {}

UnitValue::UnitValue(const double value) : value(value), isRelative(false) {}

UnitValue::UnitValue(const double value, const bool isRelative)
    : value(value), isRelative(isRelative) {}

UnitValue::UnitValue(const std::string &value) {
  std::string str = value;
  if (str.back() == '%') {
    str.pop_back();
    this->value = std::stod(str) / 100;
    this->isRelative = true;
  } else {
    throw std::runtime_error(
        "[Reanimated] RelativeOrNumericValueInterpolator: unsupported value: " +
        str);
  }
}

UnitValue::UnitValue(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isNumber()) {
    this->value = value.asNumber();
    this->isRelative = false;
  } else if (value.isString()) {
    std::string strValue = value.asString(rt).utf8(rt);
    *this = UnitValue(strValue); // Delegate to the string constructor
  } else {
    throw std::runtime_error(
        "[Reanimated] RelativeOrNumericValueInterpolator: unsupported value type");
  }
}

jsi::Value UnitValue::toJSIValue(jsi::Runtime &rt) const {
  if (isRelative) {
    return jsi::String::createFromUtf8(rt, std::to_string(value * 100) + "%");
  } else {
    return jsi::Value(value);
  }
}

} // namespace reanimated
