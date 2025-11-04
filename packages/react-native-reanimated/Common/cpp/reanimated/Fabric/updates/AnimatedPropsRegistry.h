#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

class AnimatedPropsRegistry : public UpdatesRegistry {
 public:
  void update(jsi::Runtime &rt, const jsi::Value &operations, const double timestamp);
  void remove(Tag tag) override;
  jsi::Value getUpdatesOlderThanTimestamp(jsi::Runtime &rt, const double timestamp);
  void removeUpdatesOlderThanTimestamp(const double timestamp);

 private:
  std::unordered_map<Tag, double> timestampMap_; // viewTag -> timestamp, protected by `mutex_`
};

} // namespace reanimated
