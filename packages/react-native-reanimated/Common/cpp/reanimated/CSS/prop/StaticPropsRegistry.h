#pragma once

#include <react/renderer/core/ShadowNode.h>

namespace reanimated {

using namespace facebook;
using namespace react;

using PropsObserver = std::function<void(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps)>;

class StaticPropsRegistry {
 public:
  void set(jsi::Runtime &rt, const Tag viewTag, const jsi::Value &props);
  folly::dynamic get(const Tag viewTag) const;
  void remove(const Tag viewTag);

  void addObserver(
      const unsigned observerId,
      const Tag viewTag,
      PropsObserver observer);
  void removeObserver(const unsigned observerId);

 private:
  std::unordered_map<Tag, folly::dynamic> registry_;

  std::unordered_map<Tag, std::unordered_map<unsigned, PropsObserver>>
      observers_;
  std::unordered_map<unsigned, Tag> observerTags_;

  void notifyObservers(
      jsi::Runtime &rt,
      const Tag viewTag,
      const jsi::Value &oldProps,
      const jsi::Value &newProps);
};

} // namespace reanimated
