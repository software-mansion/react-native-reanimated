#include <reanimated/CSS/interpolation/values/WithUnitInterpolator.h>

namespace reanimated {

const std::unordered_map<std::string, ConversionRate>
    WithUnitInterpolator::conversionRates = {
        {"rad", {"deg", 180.0 / M_PI}},
        {"deg", {"rad", M_PI / 180.0}},
};

WithUnitInterpolator::WithUnitInterpolator(
    std::string baseUnit,
    const std::optional<double> &defaultStyleValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::vector<std::string> &propertyPath)
    : NumericValueInterpolator(
          defaultStyleValue,
          viewStylesRepository,
          propertyPath),
      baseUnit(baseUnit) {}

double WithUnitInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return convertFromString(value.asString(rt).utf8(rt));
}

jsi::Value WithUnitInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const double &value) const {
  std::ostringstream oss;
  oss << value << baseUnit;
  return jsi::String::createFromUtf8(rt, oss.str());
}

double WithUnitInterpolator::getConversionRate(const std::string &unit) const {
  auto conversionRate = conversionRates.find(unit);
  if (conversionRate == conversionRates.end()) {
    throw std::invalid_argument(
        "[Reanimated] Conversion error: No valid conversion for unit: " + unit);
  }
  return conversionRate->second.multiplier;
}

double WithUnitInterpolator::convertFromString(const std::string &value) const {
  const std::regex regexPattern("([-+]?[0-9]*\\.?[0-9]+)(.*)");
  std::smatch match;

  if (std::regex_match(value, match, regexPattern)) {
    double numericValue = std::stod(match[1].str());
    std::string matchedUnit = match[2].str();

    // If the unit is different than the base unit, convert it.
    if (matchedUnit != baseUnit) {
      double conversionRate = getConversionRate(matchedUnit);
      return numericValue * conversionRate;
    }

    // Otherwise, just return the numeric value.
    return numericValue;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Invalid value format: '" + value +
        "'. Expected format: '<number><unit>', e.g., '3.14rad'.");
  }
}

} // namespace reanimated
