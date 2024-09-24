#pragma once

#include <reanimated/CSS/interpolation/values/NumericValueInterpolator.h>

#include <regex>
#include <sstream>
#include <stdexcept>
#include <string>
#include <unordered_map>

namespace reanimated {

struct ConversionRate {
  std::string targetUnit;
  double multiplier;
};

class WithUnitInterpolator : public NumericValueInterpolator {
 public:
  WithUnitInterpolator(
      std::string baseUnit,
      const std::optional<double> &defaultStyleValue);

 protected:
  double prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const double &value)
      const override;

 private:
  const std::string baseUnit;
  static const std::unordered_map<std::string, ConversionRate> conversionRates;

  double getConversionRate(const std::string &unit) const;

  double convertFromString(const std::string &value) const;
};

} // namespace reanimated
