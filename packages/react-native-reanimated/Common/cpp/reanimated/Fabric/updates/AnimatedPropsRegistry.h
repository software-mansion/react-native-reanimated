#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>
#include <vector>

namespace reanimated {

class AnimatedPropsRegistry : public UpdatesRegistry {
 public:
  void update(jsi::Runtime &rt, const jsi::Value &operations);
  void remove(Tag tag) override;
};

} // namespace reanimated
