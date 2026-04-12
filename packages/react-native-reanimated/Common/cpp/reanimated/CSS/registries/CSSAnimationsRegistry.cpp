#include <reanimated/CSS/registries/CSSAnimationsRegistry.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSAnimationsRegistry::CSSAnimationsRegistry(
    const std::shared_ptr<OperationsLoop> &loop,
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry)
    : loop_(loop),
      keyframesRegistry_(keyframesRegistry),
      updatedViewTags_(std::make_shared<std::unordered_set<Tag>>()),
      revertedTags_(std::make_shared<std::unordered_set<Tag>>()) {}

bool CSSAnimationsRegistry::needsFlush() const {
  return !updatedViewTags_->empty();
}

void CSSAnimationsRegistry::apply(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &compoundComponentName,
    const CSSAnimationUpdates &updates) {
  const auto viewTag = shadowNode->getTag();
  auto newGroup =
      maybeBuildNewGroup(shadowNode, compoundComponentName, updates.animationNames, updates.newAnimationSettings);

  if (newGroup) {
    auto oldIt = groups_.find(viewTag);
    if (oldIt != groups_.end()) {
      oldIt->second.unschedule();
    }

    if (newGroup->getAnimations().empty()) {
      remove(viewTag);
      return;
    }

    groups_.insert_or_assign(viewTag, std::move(*newGroup));
  }

  auto it = groups_.find(viewTag);
  if (it == groups_.end()) {
    return;
  }

  auto &group = it->second;
  group.updateSettings(updates.settingsUpdates, loop_->getTimestamp());
  group.schedule();

  setInUpdatesRegistry(group.getShadowNodeFamily(), group.computeLoopStyle());
  updatedViewTags_->insert(viewTag);
}

void CSSAnimationsRegistry::remove(const Tag viewTag) {
  auto it = groups_.find(viewTag);
  if (it != groups_.end()) {
    it->second.unschedule();
    groups_.erase(it);
  }
  removeFromUpdatesRegistry(viewTag);
  updatedViewTags_->erase(viewTag);
}

void CSSAnimationsRegistry::flushUpdates(UpdatesBatch &updatesBatch) {
  for (const auto viewTag : *updatedViewTags_) {
    const auto it = groups_.find(viewTag);
    if (it == groups_.end()) {
      continue;
    }

    auto &group = it->second;
    const auto updates = group.computeLoopStyle(true);
    if (!updates.empty()) {
      addUpdatesToBatch(group.getShadowNodeFamily(), updates);
    }
  }

  updatedViewTags_->clear();
  UpdatesRegistry::flushUpdates(updatesBatch);
  updateRegistryForRevertedAnimations();
}

std::optional<CSSAnimationsGroup> CSSAnimationsRegistry::maybeBuildNewGroup(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &compoundComponentName,
    const std::optional<std::vector<std::string>> &updatedAnimationNames,
    const CSSAnimationSettingsMap &newAnimationSettings) {
  if (!updatedAnimationNames.has_value()) {
    return std::nullopt;
  }

  const auto viewTag = shadowNode->getTag();
  const auto groupIt = groups_.find(viewTag);

  const auto &names = updatedAnimationNames.value();
  const auto timestamp = loop_->getTimestamp();

  std::unordered_map<std::string, CSSAnimationsVector> oldByName;
  if (groupIt != groups_.end()) {
    for (auto it = groupIt->second.getAnimations().rbegin(); it != groupIt->second.getAnimations().rend(); ++it) {
      oldByName[(*it)->getName()].emplace_back(*it);
    }
  }

  CSSAnimationsVector animations;
  animations.reserve(names.size());

  for (size_t i = 0; i < names.size(); ++i) {
    const auto &name = names[i];
    const auto settingsIt = newAnimationSettings.find(i);

    if (settingsIt != newAnimationSettings.end()) {
      animations.emplace_back(createAnimation(shadowNode, name, compoundComponentName, settingsIt->second, timestamp));
    } else {
      auto oldIt = oldByName.find(name);
      if (oldIt == oldByName.end()) {
        throw std::runtime_error(
            "[Reanimated] There is no animation with name " + name + " available to use at index " + std::to_string(i));
      }
      animations.emplace_back(oldIt->second.back());
      oldIt->second.pop_back();
      if (oldIt->second.empty()) {
        oldByName.erase(oldIt);
      }
    }
  }

  return CSSAnimationsGroup(shadowNode, std::move(animations));
}

std::shared_ptr<CSSAnimation> CSSAnimationsRegistry::createAnimation(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &name,
    const std::string &compoundComponentName,
    const CSSAnimationSettings &settings,
    const double timestamp) {
  const auto keyframesConfig = keyframesRegistry_->get(name, compoundComponentName);
  if (!keyframesConfig) {
    throw std::runtime_error(
        "[Reanimated] No keyframes with name `" + name + "` were registered for component `" +
        splitCompoundComponentName(compoundComponentName).second + "` (" + shadowNode->getComponentName() + ")");
  }

  return std::make_shared<CSSAnimation>(
      shadowNode, name, keyframesConfig->get(), settings, updatedViewTags_, revertedTags_, loop_, timestamp);
}

void CSSAnimationsRegistry::updateRegistryForRevertedAnimations() {
  for (const auto viewTag : *revertedTags_) {
    const auto it = groups_.find(viewTag);
    if (it != groups_.end()) {
      setInUpdatesRegistry(it->second.getShadowNodeFamily(), it->second.computeLoopStyle());
    }
  }
  revertedTags_->clear();
}

} // namespace reanimated::css
