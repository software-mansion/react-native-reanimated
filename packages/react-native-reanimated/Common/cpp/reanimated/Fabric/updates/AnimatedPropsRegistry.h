#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

using JSIUpdates = std::vector<std::tuple<Tag, std::string, std::unique_ptr<jsi::Value>>>;

class AnimatedPropsRegistry : public UpdatesRegistry {
  JSIUpdates jsiUpdates_;

 public:
  JSIUpdates getJSIUpdates();

  SurfaceId update(jsi::Runtime &rt, const jsi::Value &operations);
  void remove(Tag tag) override;
};

} // namespace reanimated
