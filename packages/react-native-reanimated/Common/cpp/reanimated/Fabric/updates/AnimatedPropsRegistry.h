#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

namespace reanimated {

class AnimatedPropsRegistry : public UpdatesRegistry {
 public:
  SurfaceId update(jsi::Runtime &rt, const jsi::Value &operations);
  void remove(jsi::Runtime &rt, const jsi::Value &viewTags);
};

} // namespace reanimated
