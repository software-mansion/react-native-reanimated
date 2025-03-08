#include <reanimated/CSS/manager/CSSUpdatesManager.h>

namespace reanimated {

CSSUpdatesManager::CSSUpdatesManager(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const std::shared_ptr<CSSKeyframesRegistry> &cssAnimationKeyframesRegistry,
    const std::shared_ptr<CSSAnimationsRegistry> &cssAnimationsRegistry,
    const std::shared_ptr<CSSTransitionsRegistry> &cssTransitionsRegistry,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : staticPropsRegistry_(staticPropsRegistry),
      cssAnimationKeyframesRegistry_(cssAnimationKeyframesRegistry),
      cssAnimationsRegistry_(cssAnimationsRegistry),
      cssTransitionsRegistry_(cssTransitionsRegistry),
      viewStylesRepository_(viewStylesRepository),
      updateHandlers_(
          {{"setViewStyle",
            [this](jsi::Runtime &rt, const jsi::Object &obj) {
              return setViewStyle(
                  rt,
                  obj.getProperty(rt, "viewTag"),
                  obj.getProperty(rt, "style"));
            }},
           {"removeViewStyle",
            [this](jsi::Runtime &rt, const jsi::Object &obj) {
                return removeViewStyle(rt, obj.getProperty(rt, "viewTag"));
            }},
           {"registerCSSKeyframes",
            [this](jsi::Runtime &rt, const jsi::Object &obj) {
                return registerCSSKeyframes(
                  rt,
                  obj.getProperty(rt, "animationName"),
                  obj.getProperty(rt, "keyframesConfig"));
            }},
           {"unregisterCSSKeyframes",
            [this](jsi::Runtime &rt, const jsi::Object &obj) {
                return unregisterCSSKeyframes(rt, obj.getProperty(rt, "animationName"));
            }},
           {"applyCSSAnimations",
            [this](jsi::Runtime &rt, const jsi::Object &obj) {
                return applyCSSAnimations(
                  rt,
                  obj.getProperty(rt, "shadowNodeWrapper"),
                  obj.getProperty(rt, "animationUpdates"));
            }},
           {"unregisterCSSAnimations",
            [this](jsi::Runtime &rt, const jsi::Object &obj) {
                return unregisterCSSAnimations(obj.getProperty(rt, "viewTag"));
            }},
           {"registerCSSTransition",
            [this](jsi::Runtime &rt, const jsi::Object &obj) {
                return registerCSSTransition(
                  rt,
                  obj.getProperty(rt, "shadowNodeWrapper"),
                  obj.getProperty(rt, "transitionConfig"));
            }},
           {"updateCSSTransition",
            [this](jsi::Runtime &rt, const jsi::Object &obj) {
                return updateCSSTransition(
                  rt,
                  obj.getProperty(rt, "viewTag"),
                  obj.getProperty(rt, "configUpdates"));
            }},
           {"unregisterCSSTransition",
            [this](jsi::Runtime &rt, const jsi::Object &obj) {
                return  unregisterCSSTransition(rt, obj.getProperty(rt, "viewTag"));
            }}}) {}

bool CSSUpdatesManager::commit(jsi::Runtime &rt, const jsi::Value &updates) {
  const auto &updatesArray = updates.asObject(rt).asArray(rt);
  const auto &updatesArraySize = updatesArray.size(rt);
  auto shouldRunCSSLoop = false;

  for (size_t i = 0; i < updatesArraySize; i++) {
    const auto &update = updatesArray.getValueAtIndex(rt, i);
    const auto &updateType = update.asObject(rt).getProperty(rt, "type");

    const auto it = updateHandlers_.find(updateType.asString(rt).utf8(rt));
    if (it == updateHandlers_.end()) {
      throw std::invalid_argument(
          "[Reanimated] Unknown CSS update type: " +
          updateType.asString(rt).utf8(rt));
    }

    const auto result = it->second(rt, update.asObject(rt));
    if (result) {
      shouldRunCSSLoop = true;
    }
  }

  return shouldRunCSSLoop;
}

bool CSSUpdatesManager::setViewStyle(
    jsi::Runtime &rt,
    const jsi::Value &viewTag,
    const jsi::Value &viewStyle) {
  const auto tag = viewTag.asNumber();
  staticPropsRegistry_->set(rt, tag, viewStyle);

  return staticPropsRegistry_->hasObservers(tag);
}

bool CSSUpdatesManager::removeViewStyle(
    jsi::Runtime &rt,
    const jsi::Value &viewTag) {
  staticPropsRegistry_->remove(viewTag.asNumber());

  return false;
}

bool CSSUpdatesManager::registerCSSKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &animationName,
    const jsi::Value &keyframesConfig) {
  cssAnimationKeyframesRegistry_->add(
      animationName.asString(rt).utf8(rt),
      parseCSSAnimationKeyframesConfig(
          rt, keyframesConfig, viewStylesRepository_));

  return false;
}

bool CSSUpdatesManager::unregisterCSSKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &animationName) {
  cssAnimationKeyframesRegistry_->remove(animationName.asString(rt).utf8(rt));

  return false;
}

bool CSSUpdatesManager::applyCSSAnimations(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &animationUpdates) {
  auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
  const auto timestamp = getCssTimestamp();
  const auto updates = parseCSSAnimationUpdates(rt, animationUpdates);

  CSSAnimationsMap newAnimations;

  if (!updates.newAnimationSettings.empty()) {
    // animationNames always exists when newAnimationSettings is not empty
    const auto animationNames = updates.animationNames.value();
    const auto animationNamesCount = animationNames.size();

    for (const auto &[index, settings] : updates.newAnimationSettings) {
      if (index >= animationNamesCount) {
        throw std::invalid_argument(
            "[Reanimated] index is out of bounds of animationNames");
      }

      const auto &name = animationNames[index];
      const auto animation = std::make_shared<CSSAnimation>(
          rt,
          shadowNode,
          name,
          cssAnimationKeyframesRegistry_->get(name),
          settings,
          timestamp);

      newAnimations.emplace(index, animation);
    }
  }

  cssAnimationsRegistry_->apply(
      rt,
      shadowNode,
      updates.animationNames,
      std::move(newAnimations),
      updates.settingsUpdates,
      timestamp);

  return true;
}

bool CSSUpdatesManager::unregisterCSSAnimations(const jsi::Value &viewTag) {
  cssAnimationsRegistry_->remove(viewTag.asNumber());

  return false;
}

bool CSSUpdatesManager::registerCSSTransition(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &transitionConfig) {
  auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

  auto transition = std::make_shared<CSSTransition>(
      std::move(shadowNode),
      parseCSSTransitionConfig(rt, transitionConfig),
      viewStylesRepository_);

  cssTransitionsRegistry_->add(transition);

  return true;
}

bool CSSUpdatesManager::updateCSSTransition(
    jsi::Runtime &rt,
    const jsi::Value &viewTag,
    const jsi::Value &configUpdates) {
  cssTransitionsRegistry_->updateSettings(
      viewTag.asNumber(), parsePartialCSSTransitionConfig(rt, configUpdates));

  return true;
}

bool CSSUpdatesManager::unregisterCSSTransition(
    jsi::Runtime &rt,
    const jsi::Value &viewTag) {
  cssTransitionsRegistry_->remove(viewTag.asNumber());

  return false;
}

} // namespace reanimated
