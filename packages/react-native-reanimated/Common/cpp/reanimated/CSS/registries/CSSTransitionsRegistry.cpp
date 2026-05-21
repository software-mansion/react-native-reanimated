#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>

#include <memory>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<OperationsLoop> &loop)
    : viewStylesRepository_(viewStylesRepository), loop_(loop) {}

bool CSSTransitionsRegistry::needsFlush() const {
  return !updatedTags_.empty();
}

void CSSTransitionsRegistry::updateConfigOrRun(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSTransitionConfig &config) {
  const auto viewTag = shadowNode->getTag();

  if (!registry_.contains(viewTag)) {
    auto transition = std::make_shared<CSSTransition>(shadowNode, viewStylesRepository_, transitionObserver_);
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
  const auto viewTag = shadowNode->getTag();
  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return;
  }

  runTransition(rt, it->second, viewTag, propertyDiffs);
}

void CSSTransitionsRegistry::run(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const PropertyValueDynamicDiffsMap &propertyDiffs) {
  const auto viewTag = shadowNode->getTag();
  const auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return;
  }
  const auto &transition = it->second;

  const auto &lastUpdates = getUpdatesFromRegistry(viewTag);
  const auto timestamp = loop_->resolveTimestamp();

  auto initialUpdate = transition->run(propertyDiffs, lastUpdates, timestamp);

  loop_->schedule(transition, timestamp + transition->getMinDelay(timestamp));

  updateInUpdatesRegistry(transition, initialUpdate);
  // Mark for flush so the initial frame is pulled by the next flushUpdates.
  updatedTags_.insert(viewTag);
}

void CSSTransitionsRegistry::flushUpdates(UpdatesBatch &updatesBatch) {
  const auto tags = std::exchange(updatedTags_, {});
  for (const auto viewTag : tags) {
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

  flush(updatesBatch);
}

#if REACT_NATIVE_VERSION_MINOR >= 85
void CSSTransitionsRegistry::flushUpdates(UpdatesBatchAnimatedProps &updatesBatch) {
  const auto tags = std::exchange(updatedTags_, {});
  for (const auto viewTag : tags) {
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

  flush(updatesBatch);
}
#endif

CSSTransitionsRegistry::TransitionObserver::TransitionObserver(CSSTransitionsRegistry &owner) : owner_(owner) {}

void CSSTransitionsRegistry::TransitionObserver::onTransitionUpdate(const Tag viewTag) {
  owner_.updatedTags_.insert(viewTag);
}

void CSSTransitionsRegistry::removeTag(const Tag viewTag) {
  const auto it = registry_.find(viewTag);
  if (it != registry_.end()) {
    loop_->remove(it->second);
  }
  removeFromUpdatesRegistry(viewTag);
  registry_.erase(viewTag);
}

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

  loop_->schedule(transition, timestamp + transition->getMinDelay(timestamp));
  updateInUpdatesRegistry(transition, initialUpdate);
  // Mark for flush so the initial frame is pulled by the next flushUpdates.
  updatedTags_.insert(viewTag);
}

} // namespace reanimated::css
