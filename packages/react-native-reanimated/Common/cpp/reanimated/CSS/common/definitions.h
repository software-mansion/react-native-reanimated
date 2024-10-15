#pragma once

#include <worklets/Tools/JSISerializer.h>

#include <functional>
#include <optional>
#include <regex>
#include <string>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace worklets;

using PropertyNames = std::vector<std::string>;
using PropertyValues = std::unique_ptr<jsi::Value>;
using PropertyPath = std::vector<std::string>;

using EasingFunction = std::function<double(double)>;
using ColorArray = std::array<uint8_t, 4>;

enum class RelativeTo {
  PARENT,
  SELF,
};

struct UnitValue {
  double value;
  bool isRelative;

  static UnitValue create(const double value);
  static UnitValue create(const std::string &value);
  static UnitValue fromJSIValue(jsi::Runtime &rt, const jsi::Value &value);
};

struct AngleValue {
  double value;

  static AngleValue create(const std::string &rotationString);
  static AngleValue fromJSIValue(jsi::Runtime &rt, const jsi::Value &value);
};

} // namespace reanimated
