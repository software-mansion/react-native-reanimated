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
  JSIUpdates getJSIUpdates();

  bool isEmpty() const override;
  void add(jsi::Runtime &rt, const jsi::Value &operations);
  void remove(Tag tag) override;

  Updates getFrameUpdates(double timestamp) override;
  Updates getAllUpdates(double timestamp) override;

 private:
  JSIUpdates jsiUpdates_;
  Updates currentBatch_;
  Updates allUpdates_;
};

} // namespace reanimated
