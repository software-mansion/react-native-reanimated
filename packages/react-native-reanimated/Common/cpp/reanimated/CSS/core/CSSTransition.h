#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class CSSTransition {
 public:
  CSSTransition(
      std::shared_ptr<const ShadowNode> shadowNode,
      const CSSTransitionConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  std::shared_ptr<const ShadowNode> getShadowNode() const;
  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;
  folly::dynamic run(
      jsi::Runtime &rt,
      const CSSTransitionUpdates &updates,
      double timestamp);
  folly::dynamic update(double timestamp);

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  CSSTransitionPropertiesSettings settings_;
  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;
};

} // namespace reanimated::css
