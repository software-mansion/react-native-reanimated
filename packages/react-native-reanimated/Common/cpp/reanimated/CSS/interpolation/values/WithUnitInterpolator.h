#pragma once

#include <reanimated/CSS/interpolation/values/NumericValueInterpolator.h>

#include <jsi/jsi.h>
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
 protected:
  double prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const double &value)
      const override;

 private:
  mutable std::string unit;
  static const std::unordered_map<std::string, ConversionRate> conversionRates;
};

} // namespace reanimated
