#include <reanimated/Fabric/updates/UpdatesRegistry.h>

namespace reanimated {

void UpdatesRegistry::flushUpdates(
    jsi::Runtime &rt,
    UpdatesBatch &updatesBatch) {
  std::lock_guard<std::mutex> lock{mutex_};

  auto copiedUpdatesBatch = std::move(updatesBatch_);
  updatesBatch_.clear();

  // Store all updates in the registry for later use in the commit hook
  flushUpdatesToRegistry(rt, copiedUpdatesBatch);

  // Flush the updates to the updatesBatch used to apply current changes
  for (auto &[shadowNode, props] : copiedUpdatesBatch) {
    // Add update only if the tag is not scheduled for removal
    if (tagsToRemove_.count(shadowNode->getTag()) == 0) {
      updatesBatch.emplace_back(shadowNode, std::move(props));
    }
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

folly::dynamic UpdatesRegistry::get(Tag tag) const {
  std::lock_guard<std::mutex> lock{mutex_};

  auto it = updatesRegistry_.find(tag);
  if (it == updatesRegistry_.cend()) {
    return nullptr;
  }
  return it->second.second;
}

void UpdatesRegistry::flushUpdatesToRegistry(
    jsi::Runtime &rt,
    UpdatesBatch &updatesBatch) {
  for (auto &[shadowNode, props] : updatesBatch) {
    const auto tag = shadowNode->getTag();
    auto convertedProps = dynamicFromValue(rt, *props);
    auto it = updatesRegistry_.find(tag);

    if (it == updatesRegistry_.cend()) {
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

} // namespace reanimated
