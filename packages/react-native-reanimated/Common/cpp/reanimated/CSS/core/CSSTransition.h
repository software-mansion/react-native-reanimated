#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <memory>
#include <string>

namespace reanimated::css {

class CSSTransition {
 public:
  CSSTransition(
      std::shared_ptr<const ShadowNode> shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  Tag getViewTag() const;
  std::shared_ptr<const ShadowNode> getShadowNode() const;
  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;
  folly::dynamic getCurrentInterpolationStyle() const;
  TransitionProperties getProperties() const;

  folly::dynamic run(const CSSTransitionConfig &config, const folly::dynamic &lastUpdateValue, double timestamp);
  folly::dynamic update(double timestamp);

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  // TODO - maybe remove transitionProperties_ in the future after removing transition updates registry for last frame updates
  TransitionProperties transitionProperties_;
  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;

  void
  handleChangedProperties(const CSSTransitionConfig &config, const folly::dynamic &lastUpdateValue, double timestamp);
  void handleRemovedProperties(const CSSTransitionConfig &config);
  void removeProperty(const std::string &propertyName);
};

} // namespace reanimated::css
