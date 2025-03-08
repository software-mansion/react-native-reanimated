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

  bool commit(jsi::Runtime &rt, const jsi::Value &updates);

 private:
  using UpdateHandler =
      std::function<bool(jsi::Runtime &, const jsi::Object &)>;
  const std::unordered_map<std::string, UpdateHandler> updateHandlers_;

  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  const std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry_;
  const std::shared_ptr<CSSAnimationsRegistry> cssAnimationsRegistry_;
  const std::shared_ptr<CSSTransitionsRegistry> cssTransitionsRegistry_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  bool setViewStyle(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &viewStyle);

  bool removeViewStyle(jsi::Runtime &rt, const jsi::Value &viewTag);

  bool registerCSSKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &animationName,
      const jsi::Value &keyframesConfig);

  bool unregisterCSSKeyframes(
      jsi::Runtime &rt,
      const jsi::Value &animationName);

  bool applyCSSAnimations(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &animationUpdates);

  bool unregisterCSSAnimations(const jsi::Value &viewTag);

  bool registerCSSTransition(
      jsi::Runtime &rt,
      const jsi::Value &shadowNodeWrapper,
      const jsi::Value &transitionConfig);

  bool updateCSSTransition(
      jsi::Runtime &rt,
      const jsi::Value &viewTag,
      const jsi::Value &configUpdates);

  bool unregisterCSSTransition(jsi::Runtime &rt, const jsi::Value &viewTag);
};

} // namespace reanimated
