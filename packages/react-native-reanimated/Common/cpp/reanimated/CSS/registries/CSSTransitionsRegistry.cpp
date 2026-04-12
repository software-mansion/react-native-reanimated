#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>

#include <memory>
#include <utility>

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

void CSSTransitionsRegistry::run(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSTransitionConfig &config) {
  const auto viewTag = shadowNode->getTag();

  if (!registry_.contains(viewTag)) {
    auto transition = std::make_shared<CSSTransition>(shadowNode, viewStylesRepository_, updatedViewTags_, loop_);
    registry_.insert({viewTag, transition});
  }

  const auto &transition = registry_.at(viewTag);
  const auto &lastUpdates = getUpdatesFromRegistry(viewTag);
  const auto timestamp = loop_->getTimestamp();

  auto initialUpdate = transition->run(rt, config, lastUpdates, timestamp);

  loop_->schedule(transition, transition->getMinDelay(timestamp));

  updateInUpdatesRegistry(transition, initialUpdate);
}

void CSSTransitionsRegistry::remove(const Tag viewTag) {
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

} // namespace reanimated::css
