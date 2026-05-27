#pragma once

#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

// We can just re-use the logic from the RecordPropertiesInterpolator class as
// interpolating multiple properties from the view style during animation is the
// same as interpolating record properties
class AnimationStyleInterpolator : public RecordPropertiesInterpolator {
 public:
  AnimationStyleInterpolator(
      const std::string &nativeComponentName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::shared_ptr<const PropertyInterpolatorsRecord> &allInterpolators);

  void setActiveProperties(const std::unordered_set<std::string> &propertyNames);

 private:
  const std::shared_ptr<const PropertyInterpolatorsRecord> allInterpolators_;
};

} // namespace reanimated::css
