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

  bool hasObservers(const Tag viewTag) const {
    return observers_.find(viewTag) != observers_.end();
  }

  void setObserver(const Tag viewTag, PropsObserver observer) {
    observers_[viewTag] = observer;
  }
  void removeObserver(const Tag viewTag) {
    observers_.erase(viewTag);
  }

 private:
  std::unordered_map<Tag, folly::dynamic> registry_;
  std::unordered_map<Tag, PropsObserver> observers_;

  void notifyObservers(
      jsi::Runtime &rt,
      const Tag viewTag,
      const jsi::Value &oldProps,
      const jsi::Value &newProps);
};

} // namespace reanimated
