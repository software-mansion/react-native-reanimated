#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/UnitValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>
#include <variant>

namespace reanimated {

using namespace worklets;

struct TransformOrigin {
  UnitValue x;
  UnitValue y;
  UnitValue z;

  TransformOrigin();
  explicit TransformOrigin(
      const std::variant<double, std::string> &x,
      const std::variant<double, std::string> &y,
      double z);
  explicit TransformOrigin(
      const UnitValue &x,
      const UnitValue &y,
      const UnitValue &z);
  explicit TransformOrigin(jsi::Runtime &rt, const jsi::Value &value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;

 private:
  static UnitValue valueFromVariant(
      const std::variant<double, std::string> &variant);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
