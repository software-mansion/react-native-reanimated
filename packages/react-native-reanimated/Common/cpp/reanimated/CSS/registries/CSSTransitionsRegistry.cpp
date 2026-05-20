#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <cxxreact/ReactNativeVersion.h>
#include <memory>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<OperationsLoop> &loop)
    : viewStylesRepository_(viewStylesRepository),
      loop_(loop),
      updatedViewTags_(std::make_shared<std::unordered_set<Tag>>()) {}

bool CSSTransitionsRegistry::needsFlush() const {
  return !updatedViewTags_->empty();
}

void CSSTransitionsRegistry::updateConfigOrRun(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSTransitionConfig &config) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto viewTag = shadowNode->getTag();

  if (!registry_.contains(viewTag)) {
    auto transition = std::make_shared<CSSTransition>(shadowNode, viewStylesRepository_, updatedViewTags_, loop_);
    registry_.insert({viewTag, transition});
  }

  const auto &transition = registry_.at(viewTag);

  if (config.changedPropertiesSettings.size() || config.removedProperties.size()) {
    transition->updateConfig(config.changedPropertiesSettings, config.removedProperties);
  }
  if (config.changedProperties.size()) {
    runTransition(rt, transition, viewTag, config.changedProperties);
  }
}

void CSSTransitionsRegistry::run(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDiffsMap &propertyDiffs) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto viewTag = shadowNode->getTag();
  const auto &transition = registry_.at(viewTag);

  runTransition(rt, transition, viewTag, propertyDiffs);
}

void CSSTransitionsRegistry::run(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDynamicDiffsMap &propertyDiffs) {
  std::lock_guard<std::mutex> lock{mutex_};

  const auto viewTag = shadowNode->getTag();
  const auto &transition = registry_.at(viewTag);

  const auto &lastUpdates = getUpdatesFromRegistry(viewTag);
  const auto timestamp = loop_->resolveTimestamp();

  auto initialUpdate = transition->run(propertyDiffs, lastUpdates, timestamp);

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
#if REACT_NATIVE_VERSION_MINOR >= 85
    if (!initialUpdate.empty()) {
      addRawPropsToAnimatedPropsBatch(transition->getShadowNode()->getFamilyShared(), initialUpdate);
    }
#endif
  }

  loop_->schedule(transition, timestamp + transition->getMinDelay(timestamp));

  updateInUpdatesRegistry(transition, initialUpdate);
}

void CSSTransitionsRegistry::removeTag(const Tag viewTag) {
  const auto it = registry_.find(viewTag);
  if (it != registry_.end()) {
    loop_->remove(it->second);
  }
  removeFromUpdatesRegistry(viewTag);
  registry_.erase(viewTag);
  updatedViewTags_->erase(viewTag);
}

void CSSTransitionsRegistry::flushUpdates(UpdatesBatch &updatesBatch) {
  for (const auto viewTag : *updatedViewTags_) {
    const auto it = registry_.find(viewTag);
    if (it == registry_.end()) {
      continue;
    }

    auto &transition = it->second;
    const auto updates = transition->computeCurrentStyle();

    if (!updates.empty()) {
      addUpdatesToBatch(transition->getShadowNodeFamily(), updates);
    }
  }

  updatedViewTags_->clear();
  UpdatesRegistry::flushUpdates(updatesBatch);
}

#if REACT_NATIVE_VERSION_MINOR >= 85
void CSSTransitionsRegistry::flushUpdates(UpdatesBatchAnimatedProps &updatesBatch) {
  for (const auto viewTag : *updatedViewTags_) {
    const auto it = registry_.find(viewTag);
    if (it == registry_.end()) {
      continue;
    }

    auto &transition = it->second;
    const auto updates = transition->computeCurrentStyle();

    if (!updates.empty()) {
      addRawPropsToAnimatedPropsBatch(transition->getShadowNodeFamily(), updates);
      // Legacy flushes merge each frame into the updates registry; animated-props flushes do not.
      // Keep the registry current so the next transition reads a real "from" value, not the first frame only.
      updateInUpdatesRegistry(transition, updates);
    }
  }

  updatedViewTags_->clear();
  UpdatesRegistry::flushUpdates(updatesBatch);
}
#endif

void CSSTransitionsRegistry::updateInUpdatesRegistry(
    const std::shared_ptr<CSSTransition> &transition,
    const folly::dynamic &updates) {
  const auto &shadowNode = transition->getShadowNode();
  const auto &lastUpdates = getUpdatesFromRegistry(shadowNode->getTag());
  const auto &transitionProperties = transition->getProperties();

  folly::dynamic filteredUpdates = folly::dynamic::object;

  if (!lastUpdates.empty()) {
    // Otherwise, we keep only allowed properties from the last updates
    // and update the object with the new transition starting values
    for (const auto &prop : transitionProperties) {
      if (lastUpdates.count(prop)) {
        filteredUpdates[prop] = lastUpdates[prop];
      }
    }
  }

  // updated object contains only allowed properties so we don't need
  // to do additional filtering here
  filteredUpdates.update(updates);
  setInUpdatesRegistry(shadowNode->getFamilyShared(), filteredUpdates);
}

void CSSTransitionsRegistry::runTransition(
    jsi::Runtime &rt,
    const std::shared_ptr<CSSTransition> &transition,
    const facebook::react::Tag &viewTag,
    const PropertyValueDiffsMap &propertyDiffs) {
  const auto &lastUpdates = getUpdatesFromRegistry(viewTag);
  const auto timestamp = loop_->resolveTimestamp();

  auto initialUpdate = transition->run(rt, propertyDiffs, lastUpdates, timestamp);

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
#if REACT_NATIVE_VERSION_MINOR >= 85
    if (!initialUpdate.empty()) {
      addRawPropsToAnimatedPropsBatch(transition->getShadowNode()->getFamilyShared(), initialUpdate);
    }
#endif
  }

  loop_->schedule(transition, timestamp + transition->getMinDelay(timestamp));
  updateInUpdatesRegistry(transition, initialUpdate);
}

} // namespace reanimated::css
