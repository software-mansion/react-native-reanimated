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

  /// Also removes updates older than `cleanupTimestamp` from the registry.
  jsi::Value getUpdatesOlderThanTimestamp(jsi::Runtime &rt, double timestamp, double cleanupTimestamp);

 private:
  std::unordered_map<Tag, double> timestampMap_;
  // Tags whose latest values have already been pushed to React `settledProps`.
  std::unordered_set<Tag> syncedTags_;
  // Tags that were synced to React but received a fresh worklet update since;
  // their `settledProps` are stale and need to be refreshed on the next sync.
  std::unordered_set<Tag> invalidatedTags_;

  void removeUpdatesOlderThanTimestamp(double timestamp);
  void removeTag(Tag tag) override;
};

} // namespace reanimated
