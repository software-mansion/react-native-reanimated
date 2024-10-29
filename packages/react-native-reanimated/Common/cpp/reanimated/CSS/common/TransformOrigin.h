#pragma once

#include <reanimated/CSS/common/UnitValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <variant>

namespace reanimated {

using namespace worklets;

struct TransformOrigin {
  UnitValue x;
  UnitValue y;
  UnitValue z;

  TransformOrigin();
  TransformOrigin(
      const std::variant<double, std::string> &x,
      const std::variant<double, std::string> &y,
      double z);
  TransformOrigin(const UnitValue &x, const UnitValue &y, const UnitValue &z);
  TransformOrigin(jsi::Runtime &rt, const jsi::Value &value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;

 private:
  static UnitValue valueFromVariant(
      const std::variant<double, std::string> &variant);
};

} // namespace reanimated
