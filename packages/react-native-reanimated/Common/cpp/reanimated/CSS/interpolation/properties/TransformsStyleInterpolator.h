#pragma once

#include <reanimated/CSS/interpolation/properties/ValueInterpolator.h>

#include <react/renderer/graphics/Transform.h>

#include <algorithm>
#include <functional>
#include <unordered_map>

namespace reanimated {

class TransformsStyleInterpolator : public ValueInterpolator<Transform> {
 public:
  TransformsStyleInterpolator(
      const std::optional<Transform> &defaultValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath);

 protected:
  Transform prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const Transform &value)
      const override;

  Transform interpolate(
      double localProgress,
      const Transform &fromValue,
      const Transform &toValue,
      const InterpolationUpdateContext context) const override;

 private:
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  static const std::unordered_map<
      std::string,
      std::function<TransformOperation(jsi::Runtime &, const jsi::Value &)>>
      transformOperations_;

  TransformOperation getTransformOperation(
      jsi::Runtime &rt,
      const Transform &currentTransform,
      const std::string &propertyName,
      const jsi::Value &transformValue) const;

  Transform parseTransformMatrix(
      jsi::Runtime &rt,
      const jsi::Array &matrixArray) const;
};

} // namespace reanimated
