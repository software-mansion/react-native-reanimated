#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>
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
  /// be committed, so the registry entries are redundant. Skips views that JS
  /// cannot deliver to, e.g. ones hidden by a Suspense boundary.
  jsi::Value
  collectSettledUpdates(jsi::Runtime &rt, double settledTimestamp, const std::unordered_set<Tag> &registeredViewTags);

  void removeUnmounted(const ShadowNodeFamily::Shared &shadowNodeFamily) override;
  void handleRemount(Tag tag) override;

 private:
  static constexpr size_t MIN_UNMOUNTED_FAMILIES_PRUNE_THRESHOLD = 256;

  struct WriteHistory {
    double lastWriteTimestamp = 0;
    std::unordered_set<std::string> animatedPropsKeys;
    std::unordered_set<std::string> animatedStyleKeys;
  };

  // Kept after eviction of the registry entry, until `removeTag`. Each sync
  // must send a key to the same React fields as the syncs before it.
  std::unordered_map<Tag, WriteHistory> writeHistories_;
  // Tags whose latest values have already been pushed to React `settledProps`.
  // Intentionally retained after eviction to detect re-animation staleness.
  std::unordered_set<Tag> syncedTags_;
  // Tags that were synced to React but received a fresh worklet update since;
  // their `settledProps` are stale and need to be refreshed on the next sync.
  std::unordered_set<Tag> invalidatedTags_;
  // A mapper can still update a view for a few frames after the view left the
  // shadow tree. Such updates must not add the view to the registry again.
  std::unordered_map<Tag, std::weak_ptr<const ShadowNodeFamily>> unmountedFamilies_;
  size_t unmountedFamiliesPruneThreshold_ = MIN_UNMOUNTED_FAMILIES_PRUNE_THRESHOLD;

  bool isUnmounted(const ShadowNodeFamily &shadowNodeFamily) const;
  void pruneExpiredUnmountedFamilies();

  void trackUpdate(Tag tag, const folly::dynamic &updates, bool isAnimatedProps, double timestamp);
  void invalidateSyncedTag(Tag tag);
  static jsi::Object
  createSettledUpdate(jsi::Runtime &rt, Tag viewTag, const folly::dynamic &props, const WriteHistory &writeHistory);
  void removeTag(Tag tag) override;
};

} // namespace reanimated
