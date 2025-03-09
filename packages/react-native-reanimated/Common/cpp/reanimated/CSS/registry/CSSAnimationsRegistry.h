#pragma once

#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

class CSSAnimationsRegistry final : public UpdatesRegistry {
 public:
  AnimationsVector &operator[](Tag viewTag) const;

  bool has(Tag viewTag) const;
  AnimationsVector &at(Tag viewTag) const;
  std::shared_ptr<CSSAnimation> &at(Tag viewTag, size_t index) const;

  void set(Tag viewTag, AnimationsVector &&animations);
  void remove(Tag viewTag);
  void removeBatch(const std::vector<Tag> &tagsToRemove) override;

  void applyViewAnimationsStyle(Tag viewTag, double timestamp);

 private:
  std::unordered_map<Tag, AnimationsVector> registry_;

  void handleRemove(Tag viewTag);
};

} // namespace reanimated::css
