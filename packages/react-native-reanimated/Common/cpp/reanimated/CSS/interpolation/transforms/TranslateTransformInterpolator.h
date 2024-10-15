#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

class TranslateTransformInterpolator : public TransformInterpolator {
 public:
  TranslateTransformInterpolator(
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
