#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/registries/CSSTransitionsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/PseudoStyles/PseudoSelector.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <array>
#include <map>
#include <memory>
#include <unordered_map>
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
    PseudoSelector selector;
    folly::dynamic selectorStyle;
  };

  void registerPseudoStyles(
      Tag tag,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const folly::dynamic &defaults,
      const std::vector<SelectorRegistration> &selectors);

  void remove(Tag tag);

 private:
  struct SelectorData {
    folly::dynamic selectorStyle;
  };

  struct TagEntry {
    std::shared_ptr<const ShadowNode> shadowNode;

    folly::dynamic defaults = folly::dynamic::object();
    std::map<PseudoSelector, SelectorData> selectors;

    std::array<folly::dynamic, (1u << kPseudoSelectorBits)> precomputedStyles;

    PseudoSelectorMask activeMask = 0;
  };

  std::unordered_map<Tag, TagEntry> registry_;

  PlatformAttachPseudoSelectorFunction attachFn_;
  PlatformDetachPseudoSelectorFunction detachFn_;

  std::shared_ptr<css::CSSTransitionsRegistry> cssTransitionsRegistry_;
  std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;

  static std::array<folly::dynamic, (1u << kPseudoSelectorBits)> recomputeAllStyles(const TagEntry &entry);

  void onSelectorStateChanged(Tag tag, PseudoSelector selector, bool isActive);
};

} // namespace reanimated
