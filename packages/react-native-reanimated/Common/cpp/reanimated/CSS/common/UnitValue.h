#pragma once

#include <reanimated/CSS/common/definitions.h>

namespace reanimated {

enum class RelativeTo {
  PARENT,
  SELF,
};

struct UnitValue {
  double value;
  bool isRelative;

  UnitValue();
  UnitValue(const double value);
  UnitValue(const double value, const bool isRelative);
  UnitValue(const std::string &value);
  UnitValue(jsi::Runtime &rt, const jsi::Value &value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;
};

} // namespace reanimated
