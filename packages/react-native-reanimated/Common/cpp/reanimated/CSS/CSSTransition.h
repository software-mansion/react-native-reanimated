#pragma once

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionPropertyProgressProvider.h>

#include <vector>

namespace reanimated {

class CSSTransition {
 public:
  using PartialSettings = PartialCSSTransitionSettings;

  CSSTransition(
      const unsigned id,
      const ShadowNode::Shared shadowNode,
      const CSSTransitionConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  unsigned getId() const {
    return id_;
  }
  ShadowNode::Shared getShadowNode() const {
    return shadowNode_;
  }
  const std::vector<std::string> &getPropertyNames() const {
    return propertyNames_;
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

  void
  run(jsi::Runtime &rt, const jsi::Value &oldProps, const jsi::Value &newProps);
  jsi::Value update(jsi::Runtime &rt, time_t timestamp);

  void updateSettings(
      jsi::Runtime &rt,
      const PartialCSSTransitionSettings &settings,
      const time_t timestamp);

 private:
  const unsigned id_;
  const ShadowNode::Shared shadowNode_;

  std::vector<std::string> propertyNames_;
  TransitionStyleInterpolator styleInterpolator_;
};

} // namespace reanimated
