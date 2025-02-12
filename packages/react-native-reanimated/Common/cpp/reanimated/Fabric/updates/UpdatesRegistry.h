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
    std::vector<std::pair<ShadowNode::Shared, std::unique_ptr<jsi::Value>>>;
using CSSUpdatesBatch =
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

  void flushUpdates(jsi::Runtime &rt, UpdatesBatch &updatesBatch, bool merge);
  void flushUpdates(CSSUpdatesBatch &updatesBatch, bool merge);
  void collectProps(PropsMap &propsMap);

 protected:
  mutable std::mutex mutex_;
  std::unordered_set<Tag> tagsToRemove_;

  void addUpdatesToBatch(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &props);
  void addUpdatesToBatch(
      const ShadowNode::Shared &shadowNode,
      const folly::dynamic &props);
  void setInUpdatesRegistry(
      const ShadowNode::Shared &shadowNode,
      const folly::dynamic &props);
  void removeFromUpdatesRegistry(Tag tag);

 private:
  UpdatesBatch updatesBatch_;
  CSSUpdatesBatch cssUpdatesBatch_;
  RegistryMap updatesRegistry_;

  void flushUpdatesToRegistry(
      jsi::Runtime &rt,
      const UpdatesBatch &updatesBatch,
      bool merge);
  void flushUpdatesToRegistry(
      const CSSUpdatesBatch &updatesBatch,
      bool merge);
  void runMarkedRemovals();

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  void updatePropsToRevert(Tag tag, const folly::dynamic *newProps = nullptr);
#endif
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
