#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <reanimated/Fabric/updates/propsLayoutFilter.h>

#include <folly/json.h>
#include <memory>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

std::lock_guard<std::mutex> UpdatesRegistry::lock() const {
  return std::lock_guard<std::mutex>{mutex_};
}

bool UpdatesRegistry::isEmpty() const {
  return updatesRegistry_.empty();
}

folly::dynamic UpdatesRegistry::get(const Tag tag) const {
  std::lock_guard<std::mutex> lock{mutex_};

  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.cend()) {
    return nullptr;
  }
  return it->second.second;
}

void UpdatesRegistry::flushUpdates(UpdatesBatch &updatesBatch) {
  auto copiedUpdatesBatch = std::move(updatesBatch_);
  updatesBatch_.clear();

  // Store all updates in the registry for later use in the commit hook
  flushUpdatesToRegistry(copiedUpdatesBatch);
  // Flush the updates to the updatesBatch used to apply current changes
  for (auto &[shadowNode, props] : copiedUpdatesBatch) {
    updatesBatch.emplace_back(shadowNode, std::move(props));
  }
}

void UpdatesRegistry::flushAnimatedPropsUpdates(UpdatesBatchAnimatedProps &updatesBatch) {
  auto copiedUpdatesBatch = std::move(updatesBatchAnimatedProps_);
  updatesBatchAnimatedProps_.clear();

  for (auto &[shadowNode, props] : copiedUpdatesBatch) {
    updatesBatch.emplace_back(shadowNode, std::move(props));
  }
}

void UpdatesRegistry::flushNonLayoutUpdates(AnimationMutations &mutations) {
  UpdatesBatchAnimatedProps remaining;

  for (auto &[node, animatedProp] : updatesBatchAnimatedProps_) {
    // Split typed props by layout vs non-layout.
    std::vector<std::unique_ptr<AnimatedPropBase>> nonLayoutTyped;
    std::vector<std::unique_ptr<AnimatedPropBase>> layoutTyped;
    for (auto &prop : animatedProp.props) {
      if (isLayoutProp(prop->propName)) {
        layoutTyped.push_back(std::move(prop));
      } else {
        nonLayoutTyped.push_back(std::move(prop));
      }
    }

    // Split rawProps by layout vs non-layout.
    std::unique_ptr<RawProps> nonLayoutRaw;
    std::unique_ptr<RawProps> layoutRaw;
    if (animatedProp.rawProps) {
      auto raw = animatedProp.rawProps->toDynamic();
      folly::dynamic nonLayoutDyn = folly::dynamic::object();
      folly::dynamic layoutDyn = folly::dynamic::object();
      for (const auto &key : raw.keys()) {
        const auto keyStr = key.asString();
        const auto propName = propNameFromString(keyStr);
        if (propName.has_value() && isLayoutProp(propName.value())) {
          layoutDyn[keyStr] = raw[key];
        } else {
          nonLayoutDyn[keyStr] = raw[key];
        }
      }
      if (!nonLayoutDyn.empty()) {
        nonLayoutRaw = std::make_unique<RawProps>(std::move(nonLayoutDyn));
      }
      if (!layoutDyn.empty()) {
        layoutRaw = std::make_unique<RawProps>(std::move(layoutDyn));
      }
    }

    // Non-layout part → apply now.
    if (!nonLayoutTyped.empty() || nonLayoutRaw) {
      AnimatedProps nonLayoutProps{std::move(nonLayoutTyped), std::move(nonLayoutRaw)};
      mutations.batch.push_back(
          AnimationMutation{node->getTag(), node->getFamilyShared(), std::move(nonLayoutProps), false});
    }

    // Layout part → defer to next full flush.
    if (!layoutTyped.empty() || layoutRaw) {
      AnimatedProps layoutProps{std::move(layoutTyped), std::move(layoutRaw)};
      remaining.emplace_back(node, std::move(layoutProps));
    }
  }

  updatesBatchAnimatedProps_ = std::move(remaining);
}

bool UpdatesRegistry::hasPendingAnimatedPropsUpdates() const {
  return !updatesBatchAnimatedProps_.empty();
}

UpdatesBatch UpdatesRegistry::getPendingUpdates() {
  auto lock = std::lock_guard<std::mutex>{mutex_};
  flushUpdatesToRegistry(updatesBatch_);

  UpdatesBatch updatesBatch;
  for (const auto &[tag, pair] : updatesRegistry_) {
    const auto &[shadowNode, props] = pair;
    updatesBatch.emplace_back(shadowNode, props);
  }
  return updatesBatch;
}

void UpdatesRegistry::collectProps(PropsMap &propsMap) {
  std::lock_guard<std::mutex> lock{mutex_};

  auto copiedRegistry = updatesRegistry_;
  for (const auto &[tag, pair] : copiedRegistry) {
    const auto &[shadowNode, props] = pair;
    auto &family = shadowNode->getFamily();
    auto it = propsMap.find(&family);

    if (it == propsMap.cend()) {
      auto propsVector = std::vector<RawProps>{};
      propsVector.emplace_back(RawProps(props));
      propsMap.emplace(&family, propsVector);
    } else {
      it->second.push_back(RawProps(props));
    }
  }
}

void UpdatesRegistry::addUpdatesToBatch(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const folly::dynamic &props) {
  updatesBatch_.emplace_back(shadowNode, props);
}

void UpdatesRegistry::addAnimatedPropsToBatch(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    AnimatedProps animatedProps) {
  updatesBatchAnimatedProps_.emplace_back(shadowNode, std::move(animatedProps));
}

void UpdatesRegistry::setInUpdatesRegistry(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const folly::dynamic &props) {
  const auto tag = shadowNode->getTag();
#ifdef ANDROID
  updatePropsToRevert(tag, &props);
#endif
  updatesRegistry_[tag] = std::make_pair(shadowNode, props);
}

folly::dynamic UpdatesRegistry::getUpdatesFromRegistry(const Tag tag) const {
  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.cend()) {
    return folly::dynamic();
  }
  return it->second.second;
}

void UpdatesRegistry::removeFromUpdatesRegistry(const Tag tag) {
#ifdef ANDROID
  updatePropsToRevert(tag);
#endif
  updatesRegistry_.erase(tag);
}

void UpdatesRegistry::flushUpdatesToRegistry(const UpdatesBatch &updatesBatch) {
  for (auto &[shadowNode, props] : updatesBatch) {
    const auto tag = shadowNode->getTag();
    auto it = updatesRegistry_.find(tag);

    if (it == updatesRegistry_.cend()) {
      updatesRegistry_[tag] = std::make_pair(shadowNode, props);
    } else {
      it->second.second.update(props);
    }
  }
}

#ifdef ANDROID

bool UpdatesRegistry::hasPropsToRevert() const {
  return !propsToRevertMap_.empty();
}

void UpdatesRegistry::collectPropsToRevert(PropsToRevertMap &propsToRevertMap) {
  std::lock_guard<std::mutex> lock{mutex_};

  for (const auto &[tag, pair] : propsToRevertMap_) {
    const auto &[shadowNode, props] = pair;
    const auto it = propsToRevertMap.find(tag);
    if (it == propsToRevertMap.end()) {
      propsToRevertMap[tag] = {shadowNode, props};
    } else {
      it->second.props.insert(props.begin(), props.end());
    }
  }

  propsToRevertMap_.clear();
}

void UpdatesRegistry::updatePropsToRevert(const Tag tag, const folly::dynamic *newProps) {
  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.end()) {
    return;
  }

  const auto &shadowNode = it->second.first;
  const auto &registryProps = it->second.second;
  if (propsToRevertMap_.find(tag) == propsToRevertMap_.end()) {
    propsToRevertMap_[tag] = {shadowNode, std::unordered_set<std::string>()};
  }

  if (newProps == nullptr) {
    // If newProps is not provided, revert all props from registry
    for (const auto &propName : registryProps.keys()) {
      propsToRevertMap_[tag].props.emplace(propName.asString());
    }
  } else {
    // If newProps is provided, revert only props that are in registry but not
    // in newProps
    for (const auto &propName : registryProps.keys()) {
      if (newProps->find(propName) == newProps->items().end()) {
        propsToRevertMap_[tag].props.emplace(propName.asString());
      }
    }
  }

  if (propsToRevertMap_[tag].props.empty()) {
    propsToRevertMap_.erase(tag);
  }
}

#endif

} // namespace reanimated
