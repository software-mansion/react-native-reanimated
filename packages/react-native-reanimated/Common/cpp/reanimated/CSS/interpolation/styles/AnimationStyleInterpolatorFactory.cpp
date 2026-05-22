#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolatorFactory.h>
#include <reanimated/CSS/utils/interpolators.h>

#include <memory>
#include <utility>

namespace reanimated::css {

AnimationStyleInterpolatorFactory::AnimationStyleInterpolatorFactory(
    jsi::Runtime &rt,
    const jsi::Value &keyframes,
    std::string nativeComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : nativeComponentName_(std::move(nativeComponentName)),
      viewStylesRepository_(viewStylesRepository),
      factories_(getComponentInterpolators(nativeComponentName_)),
      interpolatorsByProperty_(
          std::make_shared<PropertyInterpolatorsRecord>(parseInterpolatorsByProperty(rt, keyframes))),
      allPropertyNames_(collectPropertyNames(interpolatorsByProperty_)) {}

std::shared_ptr<AnimationStyleInterpolator> AnimationStyleInterpolatorFactory::create(
    const std::unordered_set<std::string> &propertyNames) const {
  auto interpolator = std::make_shared<AnimationStyleInterpolator>(
      nativeComponentName_, viewStylesRepository_, interpolatorsByProperty_);
  interpolator->setActiveProperties(propertyNames);
  return interpolator;
}

std::shared_ptr<AnimationStyleInterpolator> AnimationStyleInterpolatorFactory::create() const {
  return create(getAllPropertyNames());
}

const std::unordered_set<std::string> &AnimationStyleInterpolatorFactory::getAllPropertyNames() const {
  return allPropertyNames_;
}

PropertyInterpolatorsRecord AnimationStyleInterpolatorFactory::parseInterpolatorsByProperty(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) const {
  PropertyInterpolatorsRecord interpolatorsByProperty;
  const auto keyframesObject = keyframes.asObject(rt);
  const auto propertyNames = keyframesObject.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);
  interpolatorsByProperty.reserve(propertiesCount);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propertyKeyframes = keyframesObject.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));
    auto propertyInterpolator = createPropertyInterpolator(propertyName, {}, factories_, viewStylesRepository_);
    propertyInterpolator->updateKeyframes(rt, propertyKeyframes);
    interpolatorsByProperty.emplace(propertyName, std::move(propertyInterpolator));
  }

  return interpolatorsByProperty;
}

std::unordered_set<std::string> AnimationStyleInterpolatorFactory::collectPropertyNames(
    const std::shared_ptr<const PropertyInterpolatorsRecord> &interpolatorsByProperty) {
  std::unordered_set<std::string> propertyNames;
  propertyNames.reserve(interpolatorsByProperty->size());
  for (const auto &[propertyName, _] : *interpolatorsByProperty) {
    propertyNames.insert(propertyName);
  }
  return propertyNames;
}

folly::dynamic AnimationStyleInterpolatorFactory::getResetStyle(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  folly::dynamic style = folly::dynamic::object;
  for (const auto &[name, interpolator] : *interpolatorsByProperty_) {
    style[name] = interpolator->getResetStyle(shadowNode);
  }
  return style;
}

} // namespace reanimated::css
