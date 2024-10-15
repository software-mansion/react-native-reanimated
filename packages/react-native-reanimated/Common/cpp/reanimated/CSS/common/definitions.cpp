#include <reanimated/CSS/common/definitions.h>

namespace reanimated {

UnitValue UnitValue::create(double value) {
  return {value, false};
}

UnitValue UnitValue::create(const std::string &value) {
  std::string str = value;
  if (str.back() == '%') {
    str.pop_back();
    return {std::stod(str) / 100, true};
  }
  throw std::runtime_error(
      "[Reanimated] RelativeOrNumericValueInterpolator: unsupported value: " +
      str);
}

UnitValue UnitValue::fromJSIValue(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isNumber()) {
    return {value.asNumber(), false};
  }
  if (value.isString()) {
    return create(value.asString(rt).utf8(rt));
  }
  throw std::runtime_error(
      "[Reanimated] RelativeOrNumericValueInterpolator: unsupported value type");
}

AngleValue AngleValue::create(const std::string &value) {
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

  return AngleValue{numericValue * it->second};
}

AngleValue AngleValue::fromJSIValue(
    jsi::Runtime &rt,
    const jsi::Value &jsiValue) {
  if (!jsiValue.isString()) {
    throw std::invalid_argument(
        "[Reanimated] Invalid angle value: " + stringifyJSIValue(rt, jsiValue));
  }

  return create(jsiValue.asString(rt).utf8(rt));
}

} // namespace reanimated
