#include <reanimated/CSS/interpolation/values/WithUnitInterpolator.h>

namespace reanimated {

const std::unordered_map<std::string, ConversionRate>
    WithUnitInterpolator::conversionRates = {
        {"rad", {"deg", 180.0 / M_PI}},
};

double WithUnitInterpolator::convertValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  static const std::regex regexPattern("([-+]?[0-9]*\\.?[0-9]+)(.*)");
  std::smatch match;

  std::string valueStr = value.asString(rt).utf8(rt);

  if (std::regex_match(valueStr, match, regexPattern)) {
    double numericValue = std::stod(match[1].str());
    std::string matchedUnit = match[2].str();

    if (!unit.empty() && unit != matchedUnit) {
      auto conversionRate = conversionRates.find(matchedUnit);
      if (conversionRate == conversionRates.end() ||
          conversionRate->second.targetUnit != unit) {
        throw std::invalid_argument(
            "[Reanimated] Conversion error: No valid conversion from '" +
            matchedUnit + "' to '" + unit + "'. Check if you don't mix units.");
      }
      numericValue *= conversionRate->second.multiplier;
    } else {
      auto conversionRate = conversionRates.find(matchedUnit);
      if (conversionRate != conversionRates.end()) {
        numericValue *= conversionRate->second.multiplier;
        unit = conversionRate->second.targetUnit;
      } else {
        unit = matchedUnit;
      }
    }

    return numericValue;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Invalid value format: '" + valueStr +
        "'. Expected format: '<number><unit>', e.g., '3.14rad'.");
  }
}

jsi::Value WithUnitInterpolator::convertToJSIValue(
    jsi::Runtime &rt,
    const double &value) const {
  std::ostringstream oss;
  oss << value << unit;
  return jsi::String::createFromUtf8(rt, oss.str());
}

} // namespace reanimated
