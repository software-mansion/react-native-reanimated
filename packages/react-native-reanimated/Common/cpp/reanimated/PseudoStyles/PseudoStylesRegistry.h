#pragma once

#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <memory>
#include <mutex>
#include <string>
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
      const std::string &selector,
      const folly::dynamic &selectorStyle,
      const folly::dynamic &defaultStyle,
      double duration,
      double delay);

  void remove(Tag tag);

 private:
  struct Entry {
    std::shared_ptr<const ShadowNode> shadowNode;
    folly::dynamic selectorStyle;
    folly::dynamic defaultStyle;
    double duration;
    double delay;
  };

  std::mutex mutex_;
  std::unordered_map<Tag, Entry> registry_;

  PlatformAttachPseudoSelectorFunction attachFn_;
  PlatformDetachPseudoSelectorFunction detachFn_;
  OnSelectorStateChangedFn onSelectorStateChangedFn_;

  void onSelectorStateChanged(Tag tag, bool isActive);
};

} // namespace reanimated
