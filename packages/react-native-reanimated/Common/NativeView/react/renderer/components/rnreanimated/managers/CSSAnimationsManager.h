#pragma once

#include <react/renderer/components/rnreanimated/ReanimatedNodeProps.h>

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/Fabric/operations/OperationsLoop.h>

#include <folly/dynamic.h>
#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class CSSAnimationsManager {
 public:
  CSSAnimationsManager(
      std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry,
      std::shared_ptr<ViewStylesRepository> viewStylesRepository);

  // Non-copyable
  CSSAnimationsManager(const CSSAnimationsManager &) = delete;
  CSSAnimationsManager &operator=(const CSSAnimationsManager &) = delete;

  // Non-movable
  CSSAnimationsManager(CSSAnimationsManager &&) = delete;
  CSSAnimationsManager &operator=(CSSAnimationsManager &&) = delete;

  void onPropsChange(
      double timestamp,
      const ReanimatedNodeProps &oldProps,
      const ReanimatedNodeProps &newProps);
  folly::dynamic onFrame(
      double timestamp,
      const ShadowNode::Shared &shadowNode);

 private:
  using AnimationsVector = std::vector<std::shared_ptr<CSSAnimation>>;
  using NameToAnimationsMap = std::unordered_map<std::string, AnimationsVector>;

  AnimationsVector animations_;
  std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  NameToAnimationsMap createCurrentNameToAnimationsMap() const;
  AnimationsVector createAndStartNewAnimations(
      double timestamp,
      NameToAnimationsMap nameToAnimationsMap,
      const std::vector<CSSAnimationConfig> &animationConfigs);
};

} // namespace facebook::react
