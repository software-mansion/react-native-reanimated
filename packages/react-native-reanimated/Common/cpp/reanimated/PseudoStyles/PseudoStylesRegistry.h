#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/PseudoStyles/PseudoSelector.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <jsi/jsi.h>
#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <array>
#include <map>
#include <memory>
#include <mutex>
#include <unordered_map>

namespace reanimated {

using namespace facebook;
using namespace react;

class PseudoStylesRegistry : public std::enable_shared_from_this<PseudoStylesRegistry> {
 public:
  using OnSelectorStateChangedFn = std::function<void(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const folly::dynamic &fromStyle,
      const folly::dynamic &toStyle,
      const css::PseudoTransitionConfig &transitionConfig)>;

  PseudoStylesRegistry(PlatformAttachPseudoSelectorFunction attachFn, PlatformDetachPseudoSelectorFunction detachFn);

  void setOnSelectorStateChangedFn(OnSelectorStateChangedFn fn);

  void registerPseudoStyle(
      Tag tag,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      PseudoSelector selector,
      const folly::dynamic &selectorStyle,
      const folly::dynamic &defaultStyle,
      css::PseudoTransitionConfig transitionConfig);

  void remove(Tag tag);

 private:
  struct SelectorData {
    folly::dynamic selectorStyle;
    folly::dynamic defaultStyle;
  };

  struct TagEntry {
    std::shared_ptr<const ShadowNode> shadowNode;
    css::PseudoTransitionConfig transitionConfig;

    std::map<PseudoSelector, SelectorData> selectors;

    std::array<folly::dynamic, (1u << kPseudoSelectorBits)> precomputedStyles;

    PseudoSelectorMask activeMask = 0;
  };

  std::mutex mutex_;
  std::unordered_map<Tag, TagEntry> registry_;

  std::unique_ptr<jsi::Runtime> registryRuntime_;

  PlatformAttachPseudoSelectorFunction attachFn_;
  PlatformDetachPseudoSelectorFunction detachFn_;
  OnSelectorStateChangedFn onSelectorStateChangedFn_;

  static void recomputeAllStyles(TagEntry &entry);

  void onSelectorStateChanged(Tag tag, PseudoSelector selector, bool isActive);
};

} // namespace reanimated
