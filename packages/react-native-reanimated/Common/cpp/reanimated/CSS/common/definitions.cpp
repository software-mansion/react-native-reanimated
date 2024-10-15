#include <reanimated/CSS/common/definitions.h>

namespace reanimated {

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

AngleValue::AngleValue(const double value) : value(value) {}

AngleValue::AngleValue(const std::string &value) {
  static const std::regex validNumberRegex(R"(^[-+]?\d*\.?\d+$)");
  static const std::unordered_map<std::string, double> unitFactors = {
      {"rad", 1},
      {"deg", M_PI / 180},
  };

  size_t pos = value.find_first_not_of("0123456789.-+");

  if (pos == std::string::npos) {
    throw std::invalid_argument("[Reanimated] Invalid angle value: " + value);
  }

  std::string numericPart = value.substr(0, pos);
  std::string unitPart = value.substr(pos);

  if (!std::regex_match(numericPart, validNumberRegex)) {
    throw std::invalid_argument("[Reanimated] Invalid angle value: " + value);
  }

  // Lookup the unit and convert to radians
  auto it = unitFactors.find(unitPart);
  if (it == unitFactors.end()) {
    throw std::invalid_argument("[Reanimated] Invalid angle unit: " + unitPart);
  }

  double numericValue = std::stod(numericPart);

  this->value = numericValue * it->second;
}

AngleValue::AngleValue(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (!jsiValue.isString()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid angle value: " + stringifyJSIValue(rt, jsiValue));
  }

  std::string strValue = jsiValue.asString(rt).utf8(rt);
  *this = AngleValue(strValue);
}

std::string AngleValue::toString() const {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(4) << value;
  return stream.str() + "rad";
}

jsi::Value AngleValue::toJSIValue(jsi::Runtime &rt) const {
  return jsi::String::createFromUtf8(rt, toString());
}

} // namespace reanimated
