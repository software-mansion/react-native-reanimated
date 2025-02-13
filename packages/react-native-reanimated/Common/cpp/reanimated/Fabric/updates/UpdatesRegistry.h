#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

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

using UpdatesBatch =
    std::vector<std::pair<ShadowNode::Shared, folly::dynamic>>;
using RegistryMap =
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
  folly::dynamic get(Tag tag) const;

#ifdef ANDROID
  bool hasPropsToRevert() const;
  void collectPropsToRevert(PropsToRevertMap &propsToRevertMap);
#endif

  void flushUpdates(UpdatesBatch &updatesBatch, bool merge);
  void collectProps(PropsMap &propsMap);

 protected:
  mutable std::mutex mutex_;
  std::unordered_set<Tag> tagsToRemove_;

  void addUpdatesToBatch(
      const ShadowNode::Shared &shadowNode,
      const folly::dynamic &props);
  void setInUpdatesRegistry(
      const ShadowNode::Shared &shadowNode,
      const folly::dynamic &props);
  void removeFromUpdatesRegistry(Tag tag);

 private:
  UpdatesBatch updatesBatch_;
  RegistryMap updatesRegistry_;

  void flushUpdatesToRegistry(const UpdatesBatch &updatesBatch, bool merge);
  void runMarkedRemovals();

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  void updatePropsToRevert(Tag tag, const folly::dynamic *newProps = nullptr);
#endif
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
