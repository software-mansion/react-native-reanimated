#pragma once

#include <jsi/jsi.h>
#include <react/renderer/core/ShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace react;

using UpdatesBatch = std::vector<std::pair<std::shared_ptr<const ShadowNode>, folly::dynamic>>;
using RegistryMap = std::unordered_map<Tag, std::pair<std::shared_ptr<const ShadowNode>, folly::dynamic>>;

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

  virtual bool isEmpty() const;
  folly::dynamic get(Tag tag) const;
  void remove(Tag tag) {
    std::lock_guard<std::mutex> lock{mutex_};
    removeTag(tag);
  }

#ifdef ANDROID
  bool hasPropsToRevert() const;
  void collectPropsToRevert(PropsToRevertMap &propsToRevertMap);
#endif

  void flushUpdates(UpdatesBatch &updatesBatch) {
    std::lock_guard<std::mutex> lock{mutex_};
    flush(updatesBatch);
  }

  void collectProps(PropsMap &propsMap);
  UpdatesBatch getPendingUpdates();

 protected:
  mutable std::mutex mutex_;
  RegistryMap updatesRegistry_;

  /// Assumes the caller already locked the registry.
  void flush(UpdatesBatch &updatesBatch);

  /// Assumes the caller already locked the registry.
  virtual void removeTag(Tag tag) = 0;

  /// Assumes the caller already locked the registry.
  void addUpdatesToBatch(const std::shared_ptr<const ShadowNode> &shadowNode, const folly::dynamic &props);

  /// Assumes the caller already locked the registry.
  folly::dynamic getUpdatesFromRegistry(const Tag tag) const;

  /// Assumes the caller already locked the registry.
  void setInUpdatesRegistry(const std::shared_ptr<const ShadowNode> &shadowNode, const folly::dynamic &props);

  /// Assumes the caller already locked the registry.
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
