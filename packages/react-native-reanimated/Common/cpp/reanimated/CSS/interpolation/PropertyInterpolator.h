#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated {

enum class PropertyType {
  Continuous,
  Discrete,
  Object,
};

class PropertyInterpolator {
 public:
  explicit PropertyInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  void setProgressProvider(
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider);

  virtual jsi::Value getStyleValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const = 0;
  virtual jsi::Value getCurrentValue(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) const = 0;
  virtual jsi::Value getFirstKeyframeValue(jsi::Runtime &rt) const = 0;
  virtual jsi::Value getLastKeyframeValue(jsi::Runtime &rt) const = 0;

  virtual void updateKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &keyframes) = 0;
  virtual void updateKeyframesFromStyleChange(
      jsi::Runtime &rt,
      const jsi::Value &oldStyleValue,
      const jsi::Value &newStyleValue) = 0;

  virtual jsi::Value update(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) = 0;
  virtual jsi::Value reset(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode) = 0;

 protected:
  const PropertyPath propertyPath_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  std::shared_ptr<KeyframeProgressProvider> progressProvider_;
};

class PropertyInterpolatorFactory {
 public:
  explicit PropertyInterpolatorFactory(PropertyType type);
  virtual ~PropertyInterpolatorFactory() = default;

  virtual std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const = 0;

  virtual PropertyType getType() const;

  template <typename T>
  static std::shared_ptr<PropertyInterpolatorFactory> create(PropertyType type);

 private:
  PropertyType type_;
};

using PropertiesInterpolators =
    std::unordered_map<std::string, std::shared_ptr<PropertyInterpolator>>;

using PropertyInterpolatorFactories = std::
    unordered_map<std::string, std::shared_ptr<PropertyInterpolatorFactory>>;

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
