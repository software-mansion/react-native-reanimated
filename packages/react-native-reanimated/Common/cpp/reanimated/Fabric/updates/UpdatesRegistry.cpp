#include <reanimated/Fabric/updates/UpdatesRegistry.h>

namespace reanimated {

std::lock_guard<std::mutex> UpdatesRegistry::lock() const {
  return std::lock_guard<std::mutex>{mutex_};
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
