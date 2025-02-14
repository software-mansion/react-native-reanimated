#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>

namespace reanimated {

using JSIUpdates = std::vector<std::pair<Tag, std::unique_ptr<jsi::Value>>>;

class AnimatedPropsRegistry : public UpdatesRegistry {
  JSIUpdates jsiUpdates_;

 public:
  JSIUpdates getJSIUpdates();
  SurfaceId update(jsi::Runtime &rt, const jsi::Value &operations);
  void remove(jsi::Runtime &rt, const jsi::Value &viewTags);
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
