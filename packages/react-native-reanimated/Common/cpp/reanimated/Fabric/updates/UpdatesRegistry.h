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
  void collectProps(PropsMap &propsMap);
  virtual void removeBatch(const std::vector<Tag>& tagsToRemove);
  bool empty();
  virtual ~UpdatesRegistry(){}

 protected:
  mutable std::mutex mutex_;
  RegistryMap updatesRegistry_;

  void addUpdatesToBatch(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &props);
  void setInUpdatesRegistry(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &props);
  void removeFromUpdatesRegistry(Tag tag);

 private:
  UpdatesBatch updatesBatch_;

  void flushUpdatesToRegistry(
      jsi::Runtime &rt,
      const UpdatesBatch &updatesBatch,
      bool merge);

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  void updatePropsToRevert(Tag tag, const folly::dynamic *newProps = nullptr);
#endif
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
