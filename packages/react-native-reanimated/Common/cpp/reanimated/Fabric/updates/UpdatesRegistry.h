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

using UpdatesBatch = std::vector<std::pair<ShadowNodeFamily::Shared, folly::dynamic>>;
using RegistryMap = std::unordered_map<Tag, std::pair<ShadowNodeFamily::Shared, folly::dynamic>>;

#ifdef ANDROID
struct PropsToRevert {
  ShadowNodeFamily::Shared shadowNodeFamily;
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
    remove_(tag);
  }

#ifdef ANDROID
  bool hasPropsToRevert() const;
  void collectPropsToRevert(PropsToRevertMap &propsToRevertMap);
#endif

  void flushUpdates(UpdatesBatch &updatesBatch);
  void collectProps(PropsMap &propsMap);
  UpdatesBatch getPendingUpdates();

 protected:
  mutable std::mutex mutex_;
  RegistryMap updatesRegistry_;

  /// Assumes the caller already locked the registry.
  virtual void remove_(Tag tag) = 0;

  /// Assumes the caller already locked the registry.
  void addUpdatesToBatch(const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props);

  /// Assumes the caller already locked the registry.
  folly::dynamic getUpdatesFromRegistry(const Tag tag) const;

  /// Assumes the caller already locked the registry.
  void setInUpdatesRegistry(const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props);

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
