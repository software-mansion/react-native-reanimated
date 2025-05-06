#pragma once

#include <react/renderer/components/rnreanimated/Props.h>

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/Fabric/operations/OperationsLoop.h>

#include <folly/dynamic.h>
#include <memory>
#include <utility>
#include <vector>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class CSSAnimationsManager {
 public:
  CSSAnimationsManager(
      std::shared_ptr<OperationsLoop> operationsLoop,
      std::shared_ptr<ViewStylesRepository> viewStylesRepository);

  ~CSSAnimationsManager();

  folly::dynamic getCurrentFrameProps(const ShadowNode::Shared &shadowNode);

  void update(const ReanimatedViewProps &newProps);

 private:
  std::vector<CSSAnimation> animations_;

  std::shared_ptr<OperationsLoop> operationsLoop_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

} // namespace facebook::react
