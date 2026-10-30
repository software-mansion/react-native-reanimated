#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/PseudoStyles/PseudoSelector.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <cstdint>
#include <map>
#include <memory>
#include <optional>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace react;

class PseudoStylesRegistry : public std::enable_shared_from_this<PseudoStylesRegistry> {
 public:
  PseudoStylesRegistry(
      PlatformAttachPseudoSelectorFunction attachFn,
      PlatformDetachPseudoSelectorFunction detachFn,
      std::shared_ptr<css::CSSTransitionsRegistry> cssTransitionsRegistry,
      std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager);

  struct SelectorRegistration {
    PseudoSelectorKey key;
    folly::dynamic selectorStyle;
  };

  struct Registration {
    folly::dynamic defaults = folly::dynamic::object();
    std::vector<SelectorRegistration> selectors;
    std::optional<PseudoGroup> hostedGroup;
  };

  /// Replaces the view's selectors, the group it hosts and the groups it follows.
  void registerPseudoStyles(Tag tag, const std::shared_ptr<const ShadowNode> &shadowNode, Registration registration);

  void remove(Tag tag);

 private:
  struct TagEntry {
    std::shared_ptr<const ShadowNode> shadowNode;

    folly::dynamic defaults = folly::dynamic::object();
    std::map<PseudoSelectorKey, folly::dynamic> selectors;
    std::optional<PseudoGroup> hostedGroup;
  };

  /// One platform listener per view and selector, shared by the view's own selector and by every
  /// view following the group it hosts.
  struct Attachment {
    std::uint64_t generation;
    bool isActive = false;
  };

  std::unordered_map<Tag, TagEntry> registry_;
  std::unordered_map<PseudoGroup, Tag> groupHosts_;
  std::unordered_map<PseudoGroup, std::unordered_set<Tag>> groupMembers_;
  std::unordered_map<Tag, std::map<PseudoSelector, Attachment>> attachments_;
  std::uint64_t nextAttachmentGeneration_ = 0;

  PlatformAttachPseudoSelectorFunction attachFn_;
  PlatformDetachPseudoSelectorFunction detachFn_;

  std::shared_ptr<css::CSSTransitionsRegistry> cssTransitionsRegistry_;
  std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;

  static std::set<PseudoGroup> collectFollowedGroups(const TagEntry &entry);

  bool isKeyActive(Tag tag, const PseudoSelectorKey &key) const;
  folly::dynamic composeStyle(Tag tag, const TagEntry &entry) const;
  /// Union of properties styled by the currently active selectors.
  css::TransitionProperties collectPseudoLockedProperties(Tag tag, const TagEntry &entry) const;
  std::vector<Tag> collectGroupMembers(PseudoGroup group) const;
  std::optional<PseudoGroup> findHostedGroup(Tag tag) const;
  std::set<PseudoSelector> collectNeededSelectors(Tag tag) const;
  /// The views whose styles follow the platform state of `selector` on `tag`.
  std::vector<Tag> collectDependents(Tag tag, PseudoSelector selector) const;

  /// Restyles `tags` from what each displayed before `mutation` to what it composes after it.
  template <typename Mutation>
  void restyleAround(const std::vector<Tag> &tags, Mutation &&mutation);
  void applyStyleChange(Tag tag, const TagEntry &entry, const folly::dynamic &fromStyle);

  void hostGroup(Tag tag, std::optional<PseudoGroup> previousGroup, std::optional<PseudoGroup> group);
  void unfollowGroup(Tag tag, PseudoGroup group);
  void syncAttachments(Tag tag);
  void syncGroupHostAttachments(const std::set<PseudoGroup> &groups);

  void onPlatformStateChanged(Tag tag, PseudoSelector selector, std::uint64_t generation, bool isActive);
};

} // namespace reanimated
