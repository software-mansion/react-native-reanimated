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
  std::set<Tag> getTagsOlderThanTimestamp(const double timestamp);
  
 private:
  // TODO: add mutex if needed
  std::unordered_map<Tag, double> timestampMap_; // viewTag -> timestamp
};

} // namespace reanimated
