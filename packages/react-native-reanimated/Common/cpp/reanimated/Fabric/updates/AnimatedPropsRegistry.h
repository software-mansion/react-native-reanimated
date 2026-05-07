#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

class AnimatedPropsRegistry : public UpdatesRegistry {
 public:
  void update(jsi::Runtime &rt, const jsi::Value &operations, double timestamp);

  /// Also removes updates older than `cleanupTimestamp` from the registry.
  jsi::Value getUpdatesOlderThanTimestamp(jsi::Runtime &rt, double timestamp, double cleanupTimestamp);

 private:
  std::unordered_map<Tag, double> timestampMap_; // viewTag -> timestamp, protected by `mutex_`

  void removeUpdatesOlderThanTimestamp(double timestamp);
  void removeTag(Tag tag) override;
};

} // namespace reanimated
