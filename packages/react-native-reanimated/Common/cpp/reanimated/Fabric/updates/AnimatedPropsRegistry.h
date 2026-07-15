#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

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

 private:
  std::unordered_map<Tag, double> timestampMap_;
  // Tags whose latest values have already been pushed to React `settledProps`.
  // Intentionally retained after eviction to detect re-animation staleness.
  std::unordered_set<Tag> syncedTags_;
  // Tags that were synced to React but received a fresh worklet update since;
  // their `settledProps` are stale and need to be refreshed on the next sync.
  std::unordered_set<Tag> invalidatedTags_;

  void removeTag(Tag tag) override;
};

} // namespace reanimated
