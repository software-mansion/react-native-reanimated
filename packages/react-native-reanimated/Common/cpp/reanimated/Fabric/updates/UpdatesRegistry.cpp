#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

namespace reanimated {

folly::dynamic UpdatesRegistry::get(const Tag tag) const {
  std::lock_guard<std::mutex> lock{mutex_};

  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.cend()) {
    return nullptr;
  }
  return it->second.second;
}

void UpdatesRegistry::flushUpdates(
    jsi::Runtime &rt,
    UpdatesBatch &updatesBatch,
    const bool merge) {
  std::lock_guard<std::mutex> lock{mutex_};

  auto copiedUpdatesBatch = std::move(updatesBatch_);
  updatesBatch_.clear();

  // Store all updates in the registry for later use in the commit hook
  flushUpdatesToRegistry(rt, copiedUpdatesBatch, merge);
  // Flush the updates to the updatesBatch used to apply current changes
  for (auto &[shadowNode, props] : copiedUpdatesBatch) {
    updatesBatch.emplace_back(shadowNode, std::move(props));
  }
  // Remove all tags scheduled for removal
  runMarkedRemovals();
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
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &props) {
  updatesBatch_.emplace_back(
      shadowNode, std::make_unique<jsi::Value>(rt, props));
}

void UpdatesRegistry::setInUpdatesRegistry(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &props) {
  const auto tag = shadowNode->getTag();
  const auto newProps = dynamicFromValue(rt, props);
#ifdef ANDROID
  updatePropsToRevert(tag, &newProps);
#endif
  updatesRegistry_[tag] = std::make_pair(shadowNode, newProps);
}

void UpdatesRegistry::removeFromUpdatesRegistry(const Tag tag) {
#ifdef ANDROID
  updatePropsToRevert(tag);
#endif
  updatesRegistry_.erase(tag);
}

void UpdatesRegistry::flushUpdatesToRegistry(
    jsi::Runtime &rt,
    const UpdatesBatch &updatesBatch,
    const bool merge) {
  for (auto &[shadowNode, props] : updatesBatch) {
    const auto tag = shadowNode->getTag();
    auto convertedProps = dynamicFromValue(rt, *props);
    auto it = updatesRegistry_.find(tag);

    if (it == updatesRegistry_.cend() || !merge) {
      updatesRegistry_[tag] = std::make_pair(shadowNode, convertedProps);
    } else {
      it->second.second.update(convertedProps);
    }
  }
}

void UpdatesRegistry::runMarkedRemovals() {
  auto copiedTagsToRemove = std::move(tagsToRemove_);
  for (const auto tag : copiedTagsToRemove) {
    updatesRegistry_.erase(tag);
  }
  tagsToRemove_.clear();
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

void UpdatesRegistry::updatePropsToRevert(
    const Tag tag,
    const folly::dynamic *newProps) {
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

#endif // RCT_NEW_ARCH_ENABLED
