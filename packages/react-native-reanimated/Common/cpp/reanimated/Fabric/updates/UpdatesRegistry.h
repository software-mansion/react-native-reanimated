#pragma once

#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <react/renderer/core/ShadowNode.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace react;

using NodeWithPropsPair = std::pair<ShadowNode::Shared, folly::dynamic>;
using NodeWithPropsRegistry = std::unordered_map<Tag, NodeWithPropsPair>;
using PropsBatch = std::vector<NodeWithPropsPair>;

void addToPropsMap(
    PropsMap &propsMap,
    const ShadowNode::Shared &shadowNode,
    const folly::dynamic &props);

#ifdef ANDROID
struct PropsToRevert {
  ShadowNode::Shared shadowNode;
  std::unordered_set<std::string> props;
};

using PropsToRevertMap = std::unordered_map<Tag, PropsToRevert>;
#endif

class UpdatesRegistry {
 public:
  virtual ~UpdatesRegistry() {}

  std::lock_guard<std::mutex> lock() const;

  virtual bool isEmpty() const = 0;
  virtual void remove(Tag tag) = 0;

  virtual void flushFrameUpdates(
      PropsBatch &updatesBatch,
      double timestamp) = 0;
  virtual void collectAllProps(PropsMap &propsMap, double timestamp) = 0;

#ifdef ANDROID
  bool hasPropsToRevert() const;
  void collectPropsToRevert(PropsToRevertMap &propsToRevertMap);
#endif

 protected:
  mutable std::mutex mutex_;

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  void updatePropsToRevert(Tag tag, const folly::dynamic *newProps = nullptr);
#endif
};

} // namespace reanimated
