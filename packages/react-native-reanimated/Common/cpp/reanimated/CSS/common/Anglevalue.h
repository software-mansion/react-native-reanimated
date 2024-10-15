#pragma once

#include <worklets/Tools/JSISerializer.h>

#include <jsi/jsi.h>
#include <iomanip>
#include <regex>
#include <sstream>
#include <string>

namespace reanimated {

using namespace facebook;
using namespace worklets;

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
