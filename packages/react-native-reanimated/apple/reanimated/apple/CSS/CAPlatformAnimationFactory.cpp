#include <reanimated/apple/CSS/CAPlatformAnimation.h>
#include <reanimated/apple/CSS/CAPlatformAnimationFactory.h>

#include <type_traits>
#include <utility>

namespace reanimated::css {

namespace {

struct PropertyRouting {
  std::shared_ptr<CAKeyframesMap> platformProperties;
  std::unordered_set<std::string> loopProperties;
};

bool isPlatformSupportedEasing(const EasingConfig &easingConfig) {
  return std::visit(
      [](const auto &config) {
        using T = std::decay_t<decltype(config)>;
        return std::is_same_v<T, LinearEasing> || std::is_same_v<T, CubicBezierEasing>;
      },
      easingConfig);
}

const EasingConfig &easingForSegment(
    double offset,
    const EasingConfig &globalEasing,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs) {
  if (!keyframeEasingConfigs) {
    return globalEasing;
  }
  const auto it = keyframeEasingConfigs->find(offset);
  return it != keyframeEasingConfigs->end() ? it->second : globalEasing;
}

// Checks that every segment between consecutive keyframe offsets uses
// a CA-supported easing. Keyframes are already sorted with unique offsets.
bool canAnimatePropertyOnPlatform(
    const std::vector<CAKeyframe> &keyframes,
    const EasingConfig &globalEasing,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs) {
  for (size_t i = 0; i + 1 < keyframes.size(); ++i) {
    const auto &segmentEasing = easingForSegment(keyframes[i].offset, globalEasing, keyframeEasingConfigs);
    if (!isPlatformSupportedEasing(segmentEasing)) {
      return false;
    }
  }
  return true;
}

PropertyRouting routeProperties(
    const std::unordered_set<std::string> &allProperties,
    const std::shared_ptr<const CAKeyframesMap> &platformSupportedProperties,
    const EasingConfig &globalEasing,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs) {
  PropertyRouting out;

  if (!platformSupportedProperties || platformSupportedProperties->empty()) {
    out.loopProperties = allProperties;
    return out;
  }

  auto filtered = std::make_shared<CAKeyframesMap>();
  for (const auto &propertyName : allProperties) {
    const auto it = platformSupportedProperties->find(propertyName);
    if (it != platformSupportedProperties->end() &&
        canAnimatePropertyOnPlatform(it->second, globalEasing, keyframeEasingConfigs)) {
      filtered->emplace(it->first, it->second);
    } else {
      out.loopProperties.insert(propertyName);
    }
  }

  if (!filtered->empty()) {
    out.platformProperties = std::move(filtered);
  }

  return out;
}

} // namespace

CAPlatformAnimationFactory::CAPlatformAnimationFactory(
    ApplyPlatformAnimationFunction applyFn,
    RemovePlatformAnimationFunction removeFn)
    : applyFn_(std::move(applyFn)), removeFn_(std::move(removeFn)) {}

PlatformRoutingResult CAPlatformAnimationFactory::resolve(
    Tag viewTag,
    const std::string &animationName,
    const std::unordered_set<std::string> &allProperties,
    const CSSKeyframesConfig &keyframesConfig,
    const std::shared_ptr<CSSAnimationSettings> &settings) {
  PlatformRoutingResult result;

  const auto routing = routeProperties(
      allProperties,
      keyframesConfig.platformSupportedProperties,
      settings->easingConfig,
      keyframesConfig.keyframeEasingConfigs);

  if (routing.platformProperties) {
    result.animation = std::make_shared<CAPlatformAnimation>(
        viewTag,
        animationName,
        std::move(routing.platformProperties),
        settings,
        keyframesConfig.keyframeEasingConfigs,
        applyFn_,
        removeFn_);
  }

  result.remainingProperties = routing.loopProperties;
  return result;
}

} // namespace reanimated::css
