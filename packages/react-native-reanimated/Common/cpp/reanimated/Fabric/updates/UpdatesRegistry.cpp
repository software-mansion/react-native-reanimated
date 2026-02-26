#include <reanimated/Fabric/updates/UpdatesRegistry.h>

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
  for (auto &[family, props] : copiedUpdatesBatch) {
    updatesBatch.emplace_back(family, std::move(props));
  }
}

void UpdatesRegistry::collectProps(PropsMap &propsMap) {
  std::lock_guard<std::mutex> lock{mutex_};

  auto copiedRegistry = updatesRegistry_;
  for (const auto &[tag, pair] : copiedRegistry) {
    const auto &[family, props] = pair;
    auto it = propsMap.find(family);

    if (it == propsMap.cend()) {
      auto propsVector = std::vector<RawProps>{};
      propsVector.emplace_back(RawProps(props));
      propsMap.emplace(family, propsVector);
    } else {
      it->second.push_back(RawProps(props));
    }
  }
}

void UpdatesRegistry::addUpdatesToBatch(
    const std::shared_ptr<const ShadowNodeFamily> &family,
    const folly::dynamic &props) {
  updatesBatch_.emplace_back(family, props);
}

void UpdatesRegistry::setInUpdatesRegistry(
    const std::shared_ptr<const ShadowNodeFamily> &family,
    const folly::dynamic &props) {
  const auto tag = family->getTag();
#ifdef ANDROID
  updatePropsToRevert(tag, &props);
#endif
  updatesRegistry_[tag] = std::make_pair(family, props);
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
  for (auto &[family, props] : updatesBatch) {
    const auto tag = family->getTag();
    auto it = updatesRegistry_.find(tag);

    if (it == updatesRegistry_.cend()) {
      updatesRegistry_[tag] = std::make_pair(family, props);
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
    const auto &[family, props] = pair;
    const auto it = propsToRevertMap.find(tag);
    if (it == propsToRevertMap.end()) {
      propsToRevertMap[tag] = {family, props};
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

  const auto &family = it->second.first;
  const auto &registryProps = it->second.second;
  if (propsToRevertMap_.find(tag) == propsToRevertMap_.end()) {
    propsToRevertMap_[tag] = {family, std::unordered_set<std::string>()};
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
