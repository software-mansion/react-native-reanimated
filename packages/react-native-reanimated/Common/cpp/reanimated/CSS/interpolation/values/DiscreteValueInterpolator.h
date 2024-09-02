#pragma once

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <string>

namespace reanimated {

enum class DiscreteType { String, Number };

// For Strings
class DiscreteStringInterpolator : public ValueInterpolator<std::string> {
 protected:
  std::string convertValue(jsi::Runtime &rt, const jsi::Value &value)
      const override {
    return value.asString(rt).utf8(rt);
  }

  jsi::Value convertToJSIValue(jsi::Runtime &rt, const std::string &value)
      const override {
    return jsi::String::createFromUtf8(rt, value);
  }

  std::string interpolate(
      double localProgress,
      const std::string &fromValue,
      const std::string &toValue,
      const InterpolationUpdateContext context) const override {
    return localProgress < 0.5 ? fromValue : toValue;
  }
};

// For Numbers
class DiscreteNumberInterpolator : public ValueInterpolator<int> {
 protected:
  int convertValue(jsi::Runtime &rt, const jsi::Value &value) const override {
    return static_cast<int>(value.asNumber());
  }

  jsi::Value convertToJSIValue(jsi::Runtime &rt, const int &value)
      const override {
    return jsi::Value(value);
  }

  int interpolate(
      double localProgress,
      const int &fromValue,
      const int &toValue,
      const InterpolationUpdateContext context) const override {
    return localProgress < 0.5 ? fromValue : toValue;
  }
};

} // namespace reanimated
