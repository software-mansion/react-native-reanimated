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

using Updates =
    std::unordered_map<Tag, std::pair<ShadowNode::Shared, folly::dynamic>>;

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

  folly::dynamic get(Tag tag) const;
  virtual bool isEmpty() const = 0;
  virtual void remove(Tag tag) = 0;

  virtual Updates getFrameUpdates(double timestamp) = 0;
  virtual Updates getAllProps(double timestamp) = 0;

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

 private:
  void mergeUpdates(Updates &target, const Updates &updates);
};

} // namespace reanimated
