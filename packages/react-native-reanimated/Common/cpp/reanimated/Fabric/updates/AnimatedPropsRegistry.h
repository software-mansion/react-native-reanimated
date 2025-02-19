#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>

namespace reanimated {

class AnimatedPropsRegistry : public UpdatesRegistry {
 public:
  SurfaceId update(jsi::Runtime &rt, const jsi::Value &operations);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
