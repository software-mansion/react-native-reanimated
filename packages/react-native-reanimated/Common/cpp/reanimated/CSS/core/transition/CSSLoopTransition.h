#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>
#include <reanimated/Fabric/updates/LoopOperation.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

class CSSLoopTransition : public LoopOperation, public std::enable_shared_from_this<CSSLoopTransition> {
 public:
  CSSLoopTransition(
      Tag viewTag,
      const std::string &componentName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
      const std::shared_ptr<OperationsLoop> &loop);

  TransitionProperties getProperties() const;

  bool update(double timestamp) override;

  // Ingest a new transition config: apply per-property changes/removals,
  // advance progress, schedule the next tick, and return the initial frame
  // style.
  folly::dynamic run(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const CSSTransitionConfig &config,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void unschedule();
  folly::dynamic computeCurrentStyle(const std::shared_ptr<const ShadowNode> &shadowNode);

 private:
  void schedule(double startTimestamp);
  void runProperty(
      jsi::Runtime &rt,
      const std::string &propertyName,
      const CSSTransitionPropertySettings &propertySettings,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void removeProperty(const std::string &propertyName);

  const Tag viewTag_;
  const std::shared_ptr<std::unordered_set<Tag>> updatedViewTags_;
  const std::shared_ptr<OperationsLoop> loop_;

  TransitionProperties properties_;
  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;
};

} // namespace reanimated::css
