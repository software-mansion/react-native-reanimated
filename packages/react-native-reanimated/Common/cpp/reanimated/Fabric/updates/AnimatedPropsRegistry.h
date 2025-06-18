#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>
#include <vector>

namespace reanimated {

struct JSIUpdate {
  const Tag tag;
  const std::string componentName;
  std::unique_ptr<const jsi::Value> props;
};

using JSIUpdates = std::vector<JSIUpdate>;

class AnimatedPropsRegistry : public UpdatesRegistry {
  JSIUpdates jsiUpdates_;

 public:
  JSIUpdates getJSIUpdates();

  SurfaceId update(jsi::Runtime &rt, const jsi::Value &operations);
  void remove(Tag tag) override;
};

} // namespace reanimated
