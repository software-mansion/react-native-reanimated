#include <reanimated/PseudoStyles/PseudoStylesRegistry.h>

#include <react/debug/react_native_assert.h>

#include <string>
#include <utility>

namespace reanimated {

using namespace facebook::react;

PseudoStylesRegistry::PseudoStylesRegistry(
    PlatformAttachPseudoSelectorFunction attachFn,
    PlatformDetachPseudoSelectorFunction detachFn,
    std::shared_ptr<css::CSSTransitionsRegistry> cssTransitionsRegistry,
    std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager)
    : attachFn_(std::move(attachFn)),
      detachFn_(std::move(detachFn)),
      cssTransitionsRegistry_(std::move(cssTransitionsRegistry)),
      updatesRegistryManager_(std::move(updatesRegistryManager)) {}

// static
std::set<PseudoGroup> PseudoStylesRegistry::collectFollowedGroups(const TagEntry &entry) {
  std::set<PseudoGroup> groups;
  for (const auto &[key, selectorStyle] : entry.selectors) {
    if (key.group) {
      groups.insert(*key.group);
    }
  }
  return groups;
}

bool PseudoStylesRegistry::isKeyActive(const Tag tag, const PseudoSelectorKey &key) const {
  auto sourceTag = tag;
  if (key.group) {
    const auto host = groupHosts_.find(*key.group);
    if (host == groupHosts_.end()) {
      return false;
    }
    sourceTag = host->second;
  }
  const auto viewAttachments = attachments_.find(sourceTag);
  if (viewAttachments == attachments_.end()) {
    return false;
  }
  const auto attachment = viewAttachments->second.find(key.selector);
  return attachment != viewAttachments->second.end() && attachment->second.isActive;
}

folly::dynamic PseudoStylesRegistry::composeStyle(const Tag tag, const TagEntry &entry) const {
  folly::dynamic style = entry.defaults;
  for (const auto &[key, selectorStyle] : entry.selectors) {
    if (isKeyActive(tag, key)) {
      style.update(selectorStyle);
    }
  }
  return style;
}

css::TransitionProperties PseudoStylesRegistry::collectPseudoLockedProperties(const Tag tag, const TagEntry &entry)
    const {
  css::TransitionProperties properties;
  for (const auto &[key, selectorStyle] : entry.selectors) {
    if (!isKeyActive(tag, key)) {
      continue;
    }
    for (const auto &[propKey, value] : selectorStyle.items()) {
      if (!value.isNull()) {
        properties.insert(propKey.asString());
      }
    }
  }
  return properties;
}

std::vector<Tag> PseudoStylesRegistry::collectGroupMembers(const PseudoGroup group) const {
  const auto members = groupMembers_.find(group);
  if (members == groupMembers_.end()) {
    return {};
  }
  return {members->second.begin(), members->second.end()};
}

std::optional<PseudoGroup> PseudoStylesRegistry::findHostedGroup(const Tag tag) const {
  const auto entry = registry_.find(tag);
  if (entry == registry_.end() || !entry->second.hostedGroup) {
    return std::nullopt;
  }
  const auto host = groupHosts_.find(*entry->second.hostedGroup);
  if (host == groupHosts_.end() || host->second != tag) {
    return std::nullopt;
  }
  return entry->second.hostedGroup;
}

std::set<PseudoSelector> PseudoStylesRegistry::collectNeededSelectors(const Tag tag) const {
  std::set<PseudoSelector> selectors;
  const auto entry = registry_.find(tag);
  if (entry == registry_.end()) {
    return selectors;
  }
  for (const auto &[key, selectorStyle] : entry->second.selectors) {
    if (!key.group) {
      selectors.insert(key.selector);
    }
  }
  const auto hostedGroup = findHostedGroup(tag);
  if (!hostedGroup) {
    return selectors;
  }
  for (const auto member : collectGroupMembers(*hostedGroup)) {
    const auto memberEntry = registry_.find(member);
    if (memberEntry == registry_.end()) {
      continue;
    }
    for (const auto &[key, selectorStyle] : memberEntry->second.selectors) {
      if (key.group == hostedGroup) {
        selectors.insert(key.selector);
      }
    }
  }
  return selectors;
}

std::vector<Tag> PseudoStylesRegistry::collectDependents(const Tag tag, const PseudoSelector selector) const {
  std::vector<Tag> dependents;
  const auto entry = registry_.find(tag);
  if (entry == registry_.end()) {
    return dependents;
  }
  if (entry->second.selectors.contains({selector, std::nullopt})) {
    dependents.push_back(tag);
  }
  const auto hostedGroup = findHostedGroup(tag);
  if (!hostedGroup) {
    return dependents;
  }
  for (const auto member : collectGroupMembers(*hostedGroup)) {
    const auto memberEntry = registry_.find(member);
    if (memberEntry != registry_.end() && memberEntry->second.selectors.contains({selector, hostedGroup})) {
      dependents.push_back(member);
    }
  }
  return dependents;
}

template <typename Mutation>
void PseudoStylesRegistry::restyleAround(const std::vector<Tag> &tags, Mutation &&mutation) {
  std::vector<std::pair<Tag, folly::dynamic>> displayedStyles;
  displayedStyles.reserve(tags.size());
  for (const auto tag : tags) {
    const auto entry = registry_.find(tag);
    if (entry != registry_.end()) {
      displayedStyles.emplace_back(tag, composeStyle(tag, entry->second));
    }
  }

  std::forward<Mutation>(mutation)();

  for (const auto &[tag, fromStyle] : displayedStyles) {
    const auto entry = registry_.find(tag);
    if (entry != registry_.end()) {
      applyStyleChange(tag, entry->second, fromStyle);
    }
  }
}

void PseudoStylesRegistry::applyStyleChange(const Tag tag, const TagEntry &entry, const folly::dynamic &fromStyle) {
  cssTransitionsRegistry_->setPseudoLockedProperties(tag, collectPseudoLockedProperties(tag, entry));

  const auto toStyle = composeStyle(tag, entry);
  css::PropertyValueDynamicDiffsMap valueChanges;
  for (const auto &[propKey, toValue] : toStyle.items()) {
    const auto propName = propKey.asString();
    // Fallback only - the platform/loop prefer the live current value when one exists.
    const folly::dynamic &fromValue = fromStyle.count(propName) ? fromStyle[propName] : toValue;
    if (fromValue != toValue) {
      valueChanges.emplace(propName, std::make_pair(fromValue, toValue));
    }
  }
  if (!valueChanges.empty()) {
    cssTransitionsRegistry_->run(entry.shadowNode, valueChanges);
  }
}

void PseudoStylesRegistry::hostGroup(
    const Tag tag,
    const std::optional<PseudoGroup> previousGroup,
    const std::optional<PseudoGroup> group) {
  if (previousGroup == group) {
    return;
  }
  std::vector<Tag> members;
  if (previousGroup) {
    members = collectGroupMembers(*previousGroup);
  }
  if (group) {
    const auto groupMembers = collectGroupMembers(*group);
    members.insert(members.end(), groupMembers.begin(), groupMembers.end());
  }
  restyleAround(members, [&] {
    if (previousGroup) {
      const auto host = groupHosts_.find(*previousGroup);
      if (host != groupHosts_.end() && host->second == tag) {
        groupHosts_.erase(host);
      }
    }
    if (group) {
      groupHosts_[*group] = tag;
    }
  });
}

void PseudoStylesRegistry::unfollowGroup(const Tag tag, const PseudoGroup group) {
  const auto members = groupMembers_.find(group);
  if (members == groupMembers_.end()) {
    return;
  }
  members->second.erase(tag);
  if (members->second.empty()) {
    groupMembers_.erase(members);
  }
}

void PseudoStylesRegistry::syncAttachments(const Tag tag) {
  const auto neededSelectors = collectNeededSelectors(tag);
  auto &viewAttachments = attachments_[tag];

  for (auto attachment = viewAttachments.begin(); attachment != viewAttachments.end();) {
    if (neededSelectors.contains(attachment->first)) {
      ++attachment;
      continue;
    }
    detachFn_(tag, attachment->first);
    attachment = viewAttachments.erase(attachment);
  }

  for (const auto selector : neededSelectors) {
    if (viewAttachments.contains(selector)) {
      continue;
    }
    const auto generation = nextAttachmentGeneration_++;
    viewAttachments.emplace(selector, Attachment{generation});
    attachFn_(tag, selector, [weakThis = weak_from_this(), tag, selector, generation](bool isActive) {
      if (auto strongThis = weakThis.lock()) {
        strongThis->onPlatformStateChanged(tag, selector, generation, isActive);
      }
    });
  }

  if (viewAttachments.empty()) {
    attachments_.erase(tag);
  }
}

void PseudoStylesRegistry::syncGroupHostAttachments(const std::set<PseudoGroup> &groups) {
  for (const auto group : groups) {
    const auto host = groupHosts_.find(group);
    if (host != groupHosts_.end()) {
      syncAttachments(host->second);
    }
  }
}

void PseudoStylesRegistry::registerPseudoStyles(
    const Tag tag,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    Registration registration) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  auto [it, isNew] = registry_.try_emplace(tag);
  auto &entry = it->second;
  const auto displayedStyle = isNew ? std::nullopt : std::optional<folly::dynamic>(composeStyle(tag, entry));
  const auto previousDefaults = std::exchange(entry.defaults, std::move(registration.defaults));
  const auto previousGroups = collectFollowedGroups(entry);
  const auto previousHostedGroup = entry.hostedGroup;

  entry.shadowNode = shadowNode;
  entry.selectors.clear();
  for (auto &selector : registration.selectors) {
    entry.selectors.insert_or_assign(selector.key, std::move(selector.selectorStyle));
  }
  entry.hostedGroup = registration.hostedGroup;

  auto groups = collectFollowedGroups(entry);
  for (const auto group : previousGroups) {
    if (!groups.contains(group)) {
      unfollowGroup(tag, group);
    }
  }
  for (const auto group : groups) {
    groupMembers_[group].insert(tag);
  }
  hostGroup(tag, previousHostedGroup, entry.hostedGroup);

  const auto lockedProperties = collectPseudoLockedProperties(tag, entry);
  // Otherwise the lock is only refreshed by a selector toggle and goes stale when a render
  // changes which properties the pseudo block styles.
  cssTransitionsRegistry_->setPseudoLockedProperties(tag, lockedProperties);
  cssTransitionsRegistry_->reconcilePseudoStyledProperties(tag, entry.defaults, previousDefaults, lockedProperties);

  // A selector that is already active when it registers, such as one following a group whose
  // host is pressed, applies now rather than on the host's next state change.
  const auto composedStyle = composeStyle(tag, entry);
  css::PropertyValueDynamicDiffsMap valueChanges;
  for (const auto &propName : lockedProperties) {
    const auto &toValue = composedStyle[propName];
    const auto &restingStyle = displayedStyle && displayedStyle->count(propName) ? *displayedStyle : entry.defaults;
    const folly::dynamic &fromValue = restingStyle.count(propName) ? restingStyle[propName] : toValue;
    if (fromValue != toValue) {
      valueChanges.emplace(propName, std::make_pair(fromValue, toValue));
    }
  }
  if (!valueChanges.empty()) {
    cssTransitionsRegistry_->run(shadowNode, valueChanges);
  }

  groups.insert(previousGroups.begin(), previousGroups.end());
  syncAttachments(tag);
  syncGroupHostAttachments(groups);
}

void PseudoStylesRegistry::remove(Tag tag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  auto it = registry_.find(tag);
  if (it == registry_.end()) {
    return;
  }

  // The listeners are going away, so an active selector would stay applied forever.
  if (!collectPseudoLockedProperties(tag, it->second).empty()) {
    const auto displayedStyle = composeStyle(tag, it->second);
    cssTransitionsRegistry_->setPseudoLockedProperties(tag, {});
    css::PropertyValueDynamicDiffsMap valueChanges;
    for (const auto &[propKey, toValue] : it->second.defaults.items()) {
      const auto propName = propKey.asString();
      const folly::dynamic &fromValue = displayedStyle.count(propName) ? displayedStyle[propName] : toValue;
      valueChanges.emplace(propName, std::make_pair(fromValue, toValue));
    }
    cssTransitionsRegistry_->run(it->second.shadowNode, valueChanges);
  }

  // The views following the group lose their host, which ends any state it was reporting.
  hostGroup(tag, findHostedGroup(tag), std::nullopt);

  const auto groups = collectFollowedGroups(it->second);
  for (const auto group : groups) {
    unfollowGroup(tag, group);
  }
  registry_.erase(it);

  syncAttachments(tag);
  syncGroupHostAttachments(groups);
}

void PseudoStylesRegistry::onPlatformStateChanged(
    const Tag tag,
    const PseudoSelector selector,
    const std::uint64_t generation,
    const bool isActive) {
  auto lock = updatesRegistryManager_->lock();

  const auto viewAttachments = attachments_.find(tag);
  if (viewAttachments == attachments_.end()) {
    return;
  }
  const auto attachment = viewAttachments->second.find(selector);
  // A listener detached after it reported, or replaced by a newer one, speaks for nothing.
  if (attachment == viewAttachments->second.end() || attachment->second.generation != generation ||
      attachment->second.isActive == isActive) {
    return;
  }

  restyleAround(collectDependents(tag, selector), [&] { attachment->second.isActive = isActive; });
}

} // namespace reanimated
