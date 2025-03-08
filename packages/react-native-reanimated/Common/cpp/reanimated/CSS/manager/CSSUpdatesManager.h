#pragma once

#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>
#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>
#include <reanimated/CSS/registry/StaticPropsRegistry.h>

namespace reanimated {

class CSSUpdatesManager {
 public:
  CSSUpdatesManager(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      const std::shared_ptr<CSSKeyframesRegistry>
          &cssAnimationKeyframesRegistry,
      const std::shared_ptr<CSSAnimationsRegistry> &cssAnimationsRegistry,
      const std::shared_ptr<CSSTransitionsRegistry> &cssTransitionsRegistry,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  bool commit(
      jsi::Runtime &rt,
      const jsi::Value &timestamp,
      const jsi::Value &updates);

 private:
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  const std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry_;
  const std::shared_ptr<CSSAnimationsRegistry> cssAnimationsRegistry_;
  const std::shared_ptr<CSSTransitionsRegistry> cssTransitionsRegistry_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  bool setViewStyle(jsi::Runtime &rt, const jsi::Object &payload);
  void removeViewStyle(jsi::Runtime &rt, const jsi::Object &payload);
  void registerCSSKeyframes(jsi::Runtime &rt, const jsi::Object &payload);
  void unregisterCSSKeyframes(jsi::Runtime &rt, const jsi::Object &payload);
  void applyCSSAnimations(
      jsi::Runtime &rt,
      const jsi::Object &payload,
      double timestamp);
  void unregisterCSSAnimations(jsi::Runtime &rt, const jsi::Object &payload);
  void registerCSSTransition(jsi::Runtime &rt, const jsi::Object &payload);
  void updateCSSTransition(jsi::Runtime &rt, const jsi::Object &payload);
  void unregisterCSSTransition(jsi::Runtime &rt, const jsi::Object &payload);
};

} // namespace reanimated
