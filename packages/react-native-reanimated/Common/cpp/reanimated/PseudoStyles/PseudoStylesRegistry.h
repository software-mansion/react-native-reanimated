#pragma once

#include <reanimated/PseudoStyles/PseudoSelector.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

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
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const folly::dynamic &fromStyle,
      const folly::dynamic &toStyle,
      double duration,
      double delay)>;

  PseudoStylesRegistry(PlatformAttachPseudoSelectorFunction attachFn, PlatformDetachPseudoSelectorFunction detachFn);

  void setOnSelectorStateChangedFn(OnSelectorStateChangedFn fn);

  void registerPseudoStyle(
      Tag tag,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      PseudoSelector selector,
      const folly::dynamic &selectorStyle,
      const folly::dynamic &defaultStyle,
      double duration,
      double delay);

  void remove(Tag tag);

 private:
  struct SelectorData {
    folly::dynamic selectorStyle;
    folly::dynamic defaultStyle;
  };

  struct TagEntry {
    std::shared_ptr<const ShadowNode> shadowNode;
    double duration;
    double delay;

    std::map<PseudoSelector, SelectorData> selectors;

    std::array<folly::dynamic, 8> precomputedStyles;

    uint8_t activeMask = 0;
  };

  std::mutex mutex_;
  std::unordered_map<Tag, TagEntry> registry_;

  PlatformAttachPseudoSelectorFunction attachFn_;
  PlatformDetachPseudoSelectorFunction detachFn_;
  OnSelectorStateChangedFn onSelectorStateChangedFn_;

  static void recomputeAllStyles(TagEntry &entry);

  void onSelectorStateChanged(Tag tag, PseudoSelector selector, bool isActive);
};

} // namespace reanimated
