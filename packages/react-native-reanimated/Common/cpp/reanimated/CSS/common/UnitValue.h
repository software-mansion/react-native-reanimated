#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

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
  UnitValue(const double value);
  UnitValue(const double value, const bool isRelative);
  UnitValue(const std::string &value);
  UnitValue(jsi::Runtime &rt, const jsi::Value &value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  UnitValue interpolate(
      const double progress,
      const UnitValue &to,
      const UnitValueInterpolationContext &context) const;

  std::optional<double> resolve(
      const UnitValueInterpolationContext &context) const;
};

} // namespace reanimated
