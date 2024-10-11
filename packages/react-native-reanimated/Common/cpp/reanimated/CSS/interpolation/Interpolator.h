#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <react/renderer/core/ShadowNode.h>

namespace reanimated {

using namespace facebook;
using namespace react;

struct InterpolationUpdateContext {
  jsi::Runtime &rt;
  const ShadowNode::Shared &node;
  const double progress;
  const std::optional<double> previousProgress;
  const bool directionChanged;
};

class Interpolator {
 public:
  Interpolator(const PropertyPath &propertyPath)
      : propertyPath_(propertyPath) {}

  virtual jsi::Value getCurrentValue(jsi::Runtime &rt) const = 0;
  virtual jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const = 0;

  virtual void updateKeyframes(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &keyframes) = 0;
  virtual void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) = 0;

  virtual jsi::Value update(const InterpolationUpdateContext context) = 0;

 protected:
  const PropertyPath propertyPath_;
};

class InterpolatorFactory {
 public:
  virtual std::shared_ptr<Interpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const = 0;
};

using PropertiesInterpolators =
    std::unordered_map<std::string, std::shared_ptr<Interpolator>>;

using PropertiesInterpolatorFactories =
    std::unordered_map<std::string, std::shared_ptr<InterpolatorFactory>>;

} // namespace reanimated
