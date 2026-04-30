#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/core/CSSAnimationGroup.h>
#include <reanimated/CSS/registries/CSSKeyframesRegistry.h>
#include <reanimated/CSS/utils/props.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated::css {

using CSSAnimationsMap = std::unordered_map<size_t, std::shared_ptr<CSSAnimation>>;

class CSSAnimationsRegistry : public UpdatesRegistry {
 public:
  CSSAnimationsRegistry(
      const std::shared_ptr<OperationsLoop> &loop,
      const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry);

  bool needsFlush() const;

  void apply(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &compoundComponentName,
      const CSSAnimationUpdates &updates);
  void remove(Tag viewTag) override;

  void flushUpdates(UpdatesBatch &updatesBatch);

 private:
  const std::shared_ptr<OperationsLoop> loop_;
  const std::shared_ptr<CSSKeyframesRegistry> keyframesRegistry_;

  std::unordered_map<Tag, CSSAnimationGroup> groups_;
  std::shared_ptr<std::unordered_set<Tag>> updatedViewTags_;
  std::shared_ptr<std::unordered_set<Tag>> revertedTags_;

  std::optional<CSSAnimationGroup> maybeBuildNewGroup(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &compoundComponentName,
      const std::optional<std::vector<std::string>> &updatedAnimationNames,
      const CSSAnimationSettingsMap &newAnimationSettings);
  std::shared_ptr<CSSAnimation> createAnimation(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &name,
      const std::string &compoundComponentName,
      const CSSAnimationSettings &settings,
      double timestamp);
  void updateRegistryForRevertedAnimations();
};

} // namespace reanimated::css
