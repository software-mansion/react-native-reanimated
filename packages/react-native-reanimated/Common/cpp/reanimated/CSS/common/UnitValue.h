#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <string>

namespace reanimated {

enum class RelativeTo {
  PARENT,
  SELF,
};

struct UnitValueInterpolationContext {
  const ShadowNode::Shared &node;
  const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
  const std::string &relativeProperty;
  const RelativeTo relativeTo;
};

struct UnitValue {
  double value;
  bool isRelative;

  UnitValue();
  explicit UnitValue(double value);
  explicit UnitValue(double value, bool isRelative);
  explicit UnitValue(const std::string &value);
  explicit UnitValue(jsi::Runtime &rt, const jsi::Value &value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  UnitValue interpolate(
      double progress,
      const UnitValue &to,
      const UnitValueInterpolationContext &context) const;

  std::optional<double> resolve(
      const UnitValueInterpolationContext &context) const;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
