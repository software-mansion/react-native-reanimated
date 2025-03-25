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
  folly::dynamic get(Tag tag) const;
  void remove(Tag tag) override;

  void flushFrameUpdates(PropsBatch &updatesBatch);
  void collectAllProps(PropsMap &propsMa);

 private:
  JSIUpdates jsiUpdates_;
  PropsBatch updatesBatch_;
  NodeWithPropsRegistry registry_;

  void addUpdatesToRegistry();
};

} // namespace reanimated
