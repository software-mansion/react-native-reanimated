#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <cstdint>
#include <functional>
#include <unordered_map>
#include <unordered_set>

namespace reanimated {

class AnimatedPropsRegistry : public UpdatesRegistry {
 public:
  void update(jsi::Runtime &rt, const jsi::Value &operations, double timestamp);

  /// Returns updates that settled (received no update since `settledTimestamp`)
  /// or whose synced `settledProps` snapshot was invalidated by a fresh update.
  /// Settled updates are returned until `markSettledUpdateCommitted` confirms
  /// them. Also evicts entries whose settled values React has committed and
  /// settled entries of views that are no longer mounted.
  jsi::Value collectSettledUpdates(
      jsi::Runtime &rt,
      double settledTimestamp,
      const std::function<bool(const ShadowNodeFamily &)> &isMounted);

  void markSettledUpdateCommitted(Tag tag, uint64_t revision);

 private:
  std::unordered_map<Tag, double> timestampMap_;
  std::unordered_map<Tag, uint64_t> revisionMap_;
  uint64_t lastRevision_ = 0;
  // React may defer the commit indefinitely (e.g. in a suspended subtree), so
  // these entries must stay in the registry until the commit is confirmed.
  std::unordered_map<Tag, uint64_t> awaitingCommitRevisions_;
  // Tags whose latest values have been committed to React `settledProps`.
  // Intentionally retained after eviction to detect re-animation staleness.
  std::unordered_set<Tag> syncedTags_;
  // Tags that were synced to React but received a fresh worklet update since;
  // their `settledProps` are stale and need to be refreshed on the next sync.
  std::unordered_set<Tag> invalidatedTags_;

  void removeTag(Tag tag) override;
};

} // namespace reanimated
