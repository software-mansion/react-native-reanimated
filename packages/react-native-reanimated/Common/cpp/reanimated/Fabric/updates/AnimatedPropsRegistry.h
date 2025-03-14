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
  JSIUpdates jsiUpdates_;

 public:
  JSIUpdates getJSIUpdates();

  bool isEmpty() const override;
  folly::dynamic get(Tag viewTag) const;
  SurfaceId update(jsi::Runtime &rt, const jsi::Value &operations);
  void remove(Tag viewTag) override;
  UpdatesBatch collectUpdates(double timestamp) override;
  UpdatesBatch collectUpdates();

 private:
  using Registry =
      std::unordered_map<Tag, std::pair<ShadowNode::Shared, folly::dynamic>>;

  Registry registry_;
  UpdatesBatch updatesBatch_;
};

} // namespace reanimated
