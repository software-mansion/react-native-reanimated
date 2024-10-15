#pragma once

#include <worklets/Tools/JSISerializer.h>

#include <functional>
#include <iomanip>
#include <optional>
#include <regex>
#include <sstream>
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
using MatrixArray = std::array<double, 16>;

enum class RelativeTo {
  PARENT,
  SELF,
};

struct UnitValue {
  double value;
  bool isRelative;

  UnitValue() {};
  UnitValue(const double value);
  UnitValue(const double value, const bool isRelative);
  UnitValue(const std::string &value);
  UnitValue(jsi::Runtime &rt, const jsi::Value &value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;
};

struct AngleValue {
  double value;

  AngleValue() {};
  AngleValue(const double value);
  AngleValue(const std::string &rotationString);
  AngleValue(jsi::Runtime &rt, const jsi::Value &value);

  std::string toString() const;
  jsi::Value toJSIValue(jsi::Runtime &rt) const;
};

} // namespace reanimated
