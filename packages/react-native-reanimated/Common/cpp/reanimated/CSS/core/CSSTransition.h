#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>
#include <reanimated/Fabric/updates/LoopOperation.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>

namespace reanimated::css {

class CSSTransition : public LoopOperation {
 public:
  CSSTransition(
      std::shared_ptr<const ShadowNode> shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  void onUpdate(double timestamp) override;
  bool isRunning() const override;

  Tag getViewTag() const;
  std::shared_ptr<const ShadowNode> getShadowNode() const;
  ShadowNodeFamily::Shared getShadowNodeFamily() const;
  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;
  TransitionProperties getProperties() const;

  folly::dynamic
  run(jsi::Runtime &rt, const CSSTransitionConfig &config, const folly::dynamic &lastUpdateValue, double timestamp);

  folly::dynamic computeCurrentStyle();

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  TransitionProperties transitionProperties_;
  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;

  void handleChangedProperties(
      jsi::Runtime &rt,
      const CSSTransitionConfig &config,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void handleRemovedProperties(const CSSTransitionConfig &config);
  void removeProperty(const std::string &propertyName);
};

} // namespace reanimated::css
