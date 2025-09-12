#pragma once

#include <react/renderer/core/ShadowNode.h>

#include <unordered_map>

namespace reanimated::css {

using namespace facebook;
using namespace react;

using PropsObserver = std::function<
    void(const folly::dynamic &oldProps, const folly::dynamic &newProps)>;

class StaticPropsRegistry {
 public:
  void set(jsi::Runtime &rt, Tag viewTag, const jsi::Value &props);
  folly::dynamic get(Tag viewTag) const;
  bool has(Tag viewTag) const;
  void remove(Tag viewTag);
  bool isEmpty() const;

  bool hasObservers(Tag viewTag) const;
  void setObserver(Tag viewTag, PropsObserver observer);
  void removeObserver(Tag viewTag);

 private:
  std::unordered_map<Tag, folly::dynamic> registry_;
  std::unordered_map<Tag, PropsObserver> observers_;

  void notifyObservers(
      Tag viewTag,
      const folly::dynamic &oldProps,
      const folly::dynamic &newProps);
};

} // namespace reanimated::css
