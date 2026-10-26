#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

class AnimatedPropsRegistry : public UpdatesRegistry {
 public:
  void update(jsi::Runtime &rt, const jsi::Value &operations);
  void remove(Tag tag) override;
  void removeUnmounted(
      const ShadowNodeFamily::Shared &shadowNodeFamily) override;
  void handleRemount(Tag tag) override;

 private:
  static constexpr size_t MIN_UNMOUNTED_FAMILIES_PRUNE_THRESHOLD = 256;

  // A mapper can still update a view for a few frames after the view left the
  // shadow tree. Such updates must not add the view to the registry again.
  std::unordered_map<Tag, std::weak_ptr<const ShadowNodeFamily>>
      unmountedFamilies_;
  size_t unmountedFamiliesPruneThreshold_ =
      MIN_UNMOUNTED_FAMILIES_PRUNE_THRESHOLD;

  bool isUnmounted(const ShadowNodeFamily &shadowNodeFamily) const;
  void pruneExpiredUnmountedFamilies();
};

} // namespace reanimated
