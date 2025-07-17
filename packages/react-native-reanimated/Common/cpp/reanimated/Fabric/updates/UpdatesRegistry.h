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

using UpdatesBatch =
    std::vector<std::pair<std::shared_ptr<const ShadowNode>, folly::dynamic>>;
using RegistryMap = std::unordered_map<
    Tag,
    std::pair<std::shared_ptr<const ShadowNode>, folly::dynamic>>;

#ifdef ANDROID
struct PropsToRevert {
  std::shared_ptr<const ShadowNode> shadowNode;
  std::unordered_set<std::string> props;
};

using PropsToRevertMap = std::unordered_map<Tag, PropsToRevert>;
#endif

class UpdatesRegistry {
 public:
  virtual ~UpdatesRegistry() {}

  std::lock_guard<std::mutex> lock() const;

  virtual bool isEmpty() const;
  folly::dynamic get(Tag tag) const;
  virtual void remove(Tag tag) = 0;

#ifdef ANDROID
  bool hasPropsToRevert() const;
  void collectPropsToRevert(PropsToRevertMap &propsToRevertMap);
#endif

  void flushUpdates(UpdatesBatch &updatesBatch);
  void collectProps(PropsMap &propsMap);

 protected:
  mutable std::mutex mutex_;
  RegistryMap updatesRegistry_;

  void addUpdatesToBatch(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const folly::dynamic &props);
  folly::dynamic getUpdatesFromRegistry(const Tag tag) const;
  void setInUpdatesRegistry(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const folly::dynamic &props);
  void removeFromUpdatesRegistry(Tag tag);

 private:
  UpdatesBatch updatesBatch_;

  void flushUpdatesToRegistry(const UpdatesBatch &updatesBatch);

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  void updatePropsToRevert(Tag tag, const folly::dynamic *newProps = nullptr);
#endif
};

} // namespace reanimated
