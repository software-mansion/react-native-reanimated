#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSTransitionsRegistry::CSSTransitionsRegistry(
    const GetAnimationTimestampFunction &getCurrentTimestamp,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : getCurrentTimestamp_(getCurrentTimestamp), viewStylesRepository_(viewStylesRepository) {}

std::lock_guard<std::mutex> CSSTransitionsRegistry::lock() const {
  return std::lock_guard<std::mutex>{mutex_};
}

bool CSSTransitionsRegistry::isEmpty() const {
  return registry_.empty();
}

bool CSSTransitionsRegistry::hasUpdates() const {
  return !runningTransitionTags_.empty() || !delayedTransitionsManager_.empty();
}

void CSSTransitionsRegistry::run(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const CSSTransitionConfig &config) {
  const auto viewTag = shadowNode->getTag();

  if (!registry_.contains(viewTag)) {
    // Create new transition
    auto transition = std::make_shared<CSSTransition>(shadowNode, viewStylesRepository_);
    registry_.insert({viewTag, transition});
  }

  const auto &transition = registry_.at(viewTag);
  const auto timestamp = getCurrentTimestamp_();

  transition->run(rt, config, timestamp);

  scheduleOrActivateTransition(transition);
}

void CSSTransitionsRegistry::remove(const Tag viewTag) {
  delayedTransitionsManager_.remove(viewTag);
  runningTransitionTags_.erase(viewTag);
  registry_.erase(viewTag);
}

void CSSTransitionsRegistry::update(const double timestamp) {
  // Activate all delayed transitions that should start now
  activateDelayedTransitions(timestamp);

  // Iterate over active transitions and update them
  for (auto it = runningTransitionTags_.begin(); it != runningTransitionTags_.end();) {
    const auto &viewTag = *it;
    const auto &transition = registry_[viewTag];

    const folly::dynamic &updates = transition->update(timestamp);
    if (!updates.empty()) {
      updatesBatch_.emplace_back(transition->getShadowNode()->getFamilyShared(), updates);
    }

    // We remove transition from running and schedule it when animation of one
    // of properties has finished and the other one is still delayed
    const auto &minDelay = transition->getMinDelay(timestamp);
    if (minDelay > 0) {
      delayedTransitionsManager_.add(timestamp + transition->getMinDelay(timestamp), viewTag);
    }

    if (transition->getState() != TransitionProgressState::Running) {
      it = runningTransitionTags_.erase(it);
    } else {
      ++it;
    }
  }
}

void CSSTransitionsRegistry::flushUpdates(UpdatesBatch &updatesBatch) {
  updatesBatch.insert(
      updatesBatch.end(), std::make_move_iterator(updatesBatch_.begin()), std::make_move_iterator(updatesBatch_.end()));
  updatesBatch_.clear();
}

void CSSTransitionsRegistry::activateDelayedTransitions(const double timestamp) {
  while (!delayedTransitionsManager_.empty() && delayedTransitionsManager_.top().timestamp <= timestamp) {
    const auto [_, viewTag] = delayedTransitionsManager_.pop();

    // Add only these transitions which weren't removed in the meantime
    if (registry_.find(viewTag) != registry_.end()) {
      runningTransitionTags_.insert(viewTag);
    }
  }
}

void CSSTransitionsRegistry::scheduleOrActivateTransition(const std::shared_ptr<CSSTransition> &transition) {
  const auto viewTag = transition->getViewTag();
  const auto currentTimestamp = getCurrentTimestamp_();
  const auto minDelay = transition->getMinDelay(currentTimestamp);

  // Remove transition from delayed (if it is already added to delayed
  // transitions)
  delayedTransitionsManager_.remove(viewTag);

  if (minDelay > 0) {
    delayedTransitionsManager_.add(currentTimestamp + minDelay, viewTag);
  } else {
    runningTransitionTags_.insert(viewTag);
  }
}

} // namespace reanimated::css
