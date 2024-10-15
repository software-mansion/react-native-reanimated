#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class RelativeOrNumericTransformInterpolator : public TransformInterpolator {
 public:
  RelativeOrNumericTransformInterpolator(
      const RelativeTo relativeTo,
      const std::string &relativeProperty,
      const UnitValue &defaultValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;
  const UnitValue defaultValue_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

} // namespace reanimated
