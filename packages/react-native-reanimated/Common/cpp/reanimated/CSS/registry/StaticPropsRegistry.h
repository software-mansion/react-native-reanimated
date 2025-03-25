#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/core/ShadowNode.h>

#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

using namespace facebook;
using namespace react;

using PropsObserver = std::function<
    void(const folly::dynamic &oldProps, const folly::dynamic &newProps)>;

class StaticPropsRegistry {
 public:
  void set(const ShadowNode::Shared &shadowNode, const folly::dynamic &props);
  folly::dynamic get(Tag viewTag) const;
  bool has(Tag viewTag) const;
  void remove(Tag viewTag);
  bool isEmpty() const;

  bool hasObservers(Tag viewTag) const;
  void setObserver(Tag viewTag, PropsObserver observer);
  void removeObserver(Tag viewTag);

  void collectAllProps(PropsMap &propsMap);

 private:
  NodeWithPropsRegistry registry_;
  std::unordered_map<Tag, PropsObserver> observers_;

  void notifyObservers(
      Tag viewTag,
      const folly::dynamic &oldProps,
      const folly::dynamic &newProps);
};

} // namespace reanimated::css
