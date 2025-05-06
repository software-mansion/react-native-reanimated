#include <react/renderer/components/rnreanimated/managers/CSSAnimationsManager.h>

namespace facebook::react {

CSSAnimationsManager::CSSAnimationsManager(
    std::shared_ptr<OperationsLoop> operationsLoop,
    std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry,
    std::shared_ptr<ViewStylesRepository> viewStylesRepository)
    : operationsLoop_(std::move(operationsLoop)),
      cssAnimationKeyframesRegistry_(std::move(cssAnimationKeyframesRegistry)),
      viewStylesRepository_(std::move(viewStylesRepository)) {}

CSSAnimationsManager::~CSSAnimationsManager() {
  for (const auto &animation : animations_) {
    removeAnimation(animation);
  }
}

folly::dynamic CSSAnimationsManager::getCurrentFrameProps(
    const ShadowNode::Shared &shadowNode) {
  auto result = folly::dynamic();

  for (const auto &animation : animations_) {
    const auto animationProps =
        animation->getCurrentFrameProps(shadowNode, viewStylesRepository_);
    if (!animationProps.empty()) {
      result.update(animationProps);
    }
  }

  return result;
}

void CSSAnimationsManager::update(const ReanimatedViewProps &newProps) {
  // Parse properties to animation config objects
  const auto configs = parseAnimationConfigs(newProps.cssAnimations);
  // Map current animations to their names in order to reuse the same instances
  // for animations with the same names
  auto nameToAnimationsMap = createCurrentNameToAnimationsMap();
  // Build a vector with the new animations
  animations_ = createNewAnimationsVector(nameToAnimationsMap, configs);
  // Remove all remaining animations in the map
  for (const auto &[_, animations] : nameToAnimationsMap) {
    for (const auto &animation : animations) {
      removeAnimation(animation);
    }
  }
}

std::vector<CSSAnimationConfig> CSSAnimationsManager::parseAnimationConfigs(
    const folly::dynamic &cssAnimations) const {
  std::vector<CSSAnimationConfig> animationConfigs;

  if (cssAnimations.isArray()) {
    animationConfigs.reserve(cssAnimations.size());
    for (const auto &animationConfig : cssAnimations) {
      animationConfigs.push_back(parseCSSAnimationConfig(animationConfig));
    }
  }

  return animationConfigs;
}

CSSAnimationsManager::NameToAnimationsMap
CSSAnimationsManager::createCurrentNameToAnimationsMap() const {
  NameToAnimationsMap nameToAnimationsMap;

  for (const auto &animation : animations_) {
    nameToAnimationsMap[animation->getName()].push_back(animation);
  }

  return nameToAnimationsMap;
}

CSSAnimationsManager::AnimationsVector
CSSAnimationsManager::createNewAnimationsVector(
    NameToAnimationsMap &nameToAnimationsMap,
    const std::vector<CSSAnimationConfig> &animationConfigs) {
  AnimationsVector result;
  result.reserve(animationConfigs.size());

  const auto timestamp = operationsLoop_->getFrameTimestamp();

  for (const auto &animationConfig : animationConfigs) {
    const auto &animationName = animationConfig.name;
    const auto it = nameToAnimationsMap.find(animationName);

    if (it == nameToAnimationsMap.end()) {
      // Create a new animation the animation with the same name doesn't exist
      result.push_back(createAnimation(animationConfig, timestamp));
    } else {
      // Update the animation with the settings from the new config
      auto &animations = it->second;
      const auto &animation = animations.back();
      animation->updateSettings(animationConfig, timestamp);
      result.push_back(animation);
      animations.pop_back();

      if (animations.empty()) {
        nameToAnimationsMap.erase(it);
      }
    }
  }

  return result;
}

std::shared_ptr<CSSAnimation> CSSAnimationsManager::createAnimation(
    const CSSAnimationConfig &animationConfig,
    const double timestamp) {
  LOG(INFO) << "createAnimation: " << animationConfig.name;
  return std::make_shared<CSSAnimation>(
      animationConfig, cssAnimationKeyframesRegistry_, timestamp);
}

void CSSAnimationsManager::removeAnimation(
    const std::shared_ptr<CSSAnimation> &animation) {
  // TODO - implement
}

} // namespace facebook::react
