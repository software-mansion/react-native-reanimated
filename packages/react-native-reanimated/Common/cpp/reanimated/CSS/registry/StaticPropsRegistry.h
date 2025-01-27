#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/ShadowNode.h>

#include <unordered_map>
#include <utility>

namespace reanimated {

using namespace facebook;
using namespace react;

using PropsObserver = std::function<void(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps)>;

class StaticPropsRegistry {
 public:
  void set(jsi::Runtime &rt, Tag viewTag, const jsi::Value &props);
  folly::dynamic get(Tag viewTag) const;
  bool has(Tag viewTag) const;
  void remove(Tag viewTag);

  bool hasObservers(const Tag viewTag) const;
  void setObserver(const Tag viewTag, PropsObserver observer);
  void removeObserver(const Tag viewTag);

 private:
  std::unordered_map<Tag, folly::dynamic> registry_;
  std::unordered_map<Tag, PropsObserver> observers_;

  void notifyObservers(
      jsi::Runtime &rt,
      Tag viewTag,
      const jsi::Value &oldProps,
      const jsi::Value &newProps);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
