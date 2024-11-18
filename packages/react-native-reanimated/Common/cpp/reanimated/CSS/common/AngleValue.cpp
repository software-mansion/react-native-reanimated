#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/common/AngleValue.h>

namespace reanimated {

AngleValue::AngleValue() : value(0) {}

AngleValue::AngleValue(const double value) : value(value) {}

AngleValue::AngleValue(const std::string &rotationString) {
  static const std::regex validNumberRegex(R"(^[-+]?\d*\.?\d+$)");
  static const std::unordered_map<std::string, double> unitFactors = {
      {"rad", 1},
      {"deg", M_PI / 180},
  };

  size_t pos = rotationString.find_first_not_of("0123456789.-+");

  if (pos == std::string::npos) {
    throw std::invalid_argument(
        "[Reanimated] Invalid angle value: " + rotationString);
  }

  std::string numericPart = rotationString.substr(0, pos);
  std::string unitPart = rotationString.substr(pos);

  if (!std::regex_match(numericPart, validNumberRegex)) {
    throw std::invalid_argument(
        "[Reanimated] Invalid angle value: " + rotationString);
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

#endif // RCT_NEW_ARCH_ENABLED
