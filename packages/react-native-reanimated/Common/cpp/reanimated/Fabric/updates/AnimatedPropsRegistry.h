#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

using JSIUpdates = std::vector<std::pair<Tag, std::unique_ptr<jsi::Value>>>;

class AnimatedPropsRegistry : public UpdatesRegistry {
 public:
  JSIUpdates getNonAnimatablePropUpdates();

  void update(
      jsi::Runtime &rt,
      const jsi::Value &operations,
      const std::unordered_set<std::string> &animatablePropNames);
  void remove(Tag tag) override;

 private:
  JSIUpdates nonAnimatablePropUpdates_;

  void addNonAnimatablePropUpdates(
      jsi::Runtime &rt,
      const Tag tag,
      const jsi::Value &props,
      const std::unordered_set<std::string> &animatablePropNames);
};

} // namespace reanimated
