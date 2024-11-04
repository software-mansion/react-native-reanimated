#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

namespace reanimated {

struct PropertyInterpolationUpdateContext {
  jsi::Runtime &rt;
  const ShadowNode::Shared &node;
  const double progress;
  const std::optional<double> previousProgress;
  const bool directionChanged;
};

class PropertyInterpolator {
 public:
  PropertyInterpolator(const PropertyPath &propertyPath)
      : propertyPath_(propertyPath) {}

  virtual jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const = 0;
  virtual jsi::Value getCurrentValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const = 0;

  virtual void updateKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &keyframes) = 0;
  virtual void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) = 0;

  virtual jsi::Value update(
      const PropertyInterpolationUpdateContext &context) = 0;
  virtual jsi::Value reset(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) = 0;

 protected:
  const PropertyPath propertyPath_;
};

class PropertyInterpolatorFactory {
 public:
  virtual std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const = 0;
  virtual ~PropertyInterpolatorFactory() = default;
};

using PropertiesInterpolators =
    std::unordered_map<std::string, std::shared_ptr<PropertyInterpolator>>;

using PropertiesInterpolatorFactories = std::
    unordered_map<std::string, std::shared_ptr<PropertyInterpolatorFactory>>;

} // namespace reanimated
