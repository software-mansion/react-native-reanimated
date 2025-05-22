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
      std::shared_ptr<OperationsLoop> operationsLoop,
      std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry,
      std::shared_ptr<ViewStylesRepository> viewStylesRepository);

  ~CSSAnimationsManager();

  folly::dynamic getCurrentFrameProps(const ShadowNode::Shared &shadowNode);

  void update(
      const ReanimatedNodeProps &oldProps,
      const ReanimatedNodeProps &newProps);

 private:
  using AnimationsVector = std::vector<std::shared_ptr<CSSAnimation>>;
  using NameToAnimationsMap = std::unordered_map<std::string, AnimationsVector>;

  AnimationsVector animations_;
  std::unordered_map<std::string, OperationsLoop::OperationHandle>
      operationHandles_;

  std::shared_ptr<OperationsLoop> operationsLoop_;
  std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  NameToAnimationsMap createCurrentNameToAnimationsMap() const;
  AnimationsVector createAndStartNewAnimations(
      NameToAnimationsMap &nameToAnimationsMap,
      const std::vector<CSSAnimationConfig> &animationConfigs);

  std::shared_ptr<CSSAnimation> createAnimation(
      const CSSAnimationConfig &animationConfig,
      double timestamp);
  void removeAnimationOperation(const std::shared_ptr<CSSAnimation> &animation);
  void updateAnimationOperation(const std::shared_ptr<CSSAnimation> &animation);
};

} // namespace facebook::react
