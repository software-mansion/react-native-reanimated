#pragma once

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

#include <vector>

namespace reanimated {

class CSSTransition { // TODO - implement
 public:
  using PartialSettings = PartialCSSTransitionSettings;

  CSSTransition(
      jsi::Runtime &rt,
      const unsigned id,
      const ShadowNode::Shared shadowNode,
      const CSSTransitionConfig &config);

  unsigned getId() const {
    return id_;
  }
  ShadowNode::Shared getShadowNode() const {
    return shadowNode_;
  }
  double getMinDelay() const {
    return 0; // TODO
  }
  TransitionProgressState getState(const time_t timestamp) const {
    return TransitionProgressState::FINISHED; // TODO
  }
  jsi::Value getViewStyle(jsi::Runtime &rt) const {
    return jsi::Value::undefined(); // TODO
  }

  void start(time_t timestamp);
  void finish(const bool revertChanges);
  jsi::Value update(jsi::Runtime &rt, time_t timestamp);

  void updateSettings(
      jsi::Runtime &rt,
      const PartialCSSTransitionSettings &settings,
      const time_t timestamp);

 private:
  const unsigned id_;
  const ShadowNode::Shared shadowNode_;

  TransitionStyleInterpolator styleInterpolator_;
};

} // namespace reanimated
