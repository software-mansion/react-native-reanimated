#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <unordered_map>
#include <unordered_set>

namespace reanimated {

class AnimatedPropsRegistry : public UpdatesRegistry {
 public:
  void update(jsi::Runtime &rt, const jsi::Value &operations, double timestamp);

  /// Returns updates that settled (received no update since `settledTimestamp`)
  /// or whose synced `settledProps` snapshot was invalidated by a fresh update.
  /// Also evicts entries that have already been synced to React — by the time
  /// of the next call, the corresponding `settledProps` state is guaranteed to
  /// be committed, so the registry entries are redundant.
  jsi::Value collectSettledUpdates(jsi::Runtime &rt, double settledTimestamp);

  void removeUnmounted(const ShadowNodeFamily::Shared &shadowNodeFamily) override;
  void handleRemount(Tag tag) override;

 private:
  static constexpr size_t MIN_UNMOUNTED_FAMILIES_PRUNE_THRESHOLD = 256;

  std::unordered_map<Tag, double> timestampMap_;
  // Tags whose latest values have already been pushed to React `settledProps`.
  // Intentionally retained after eviction to detect re-animation staleness.
  std::unordered_set<Tag> syncedTags_;
  // Tags that were synced to React but received a fresh worklet update since;
  // their `settledProps` are stale and need to be refreshed on the next sync.
  std::unordered_set<Tag> invalidatedTags_;
  // A mapper can still update a view for some frames after the view left the
  // shadow tree. These updates must not add the view to the registry again.
  std::unordered_map<Tag, std::weak_ptr<const ShadowNodeFamily>> unmountedFamilies_;
  size_t unmountedFamiliesPruneThreshold_ = MIN_UNMOUNTED_FAMILIES_PRUNE_THRESHOLD;

  bool isUnmounted(const ShadowNodeFamily &shadowNodeFamily) const;
  void pruneExpiredUnmountedFamilies();

  void removeTag(Tag tag) override;
};

} // namespace reanimated
