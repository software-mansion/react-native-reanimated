#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

namespace reanimated {

template <typename OperationType>
class TranslateTransformInterpolatorBase
    : public TransformInterpolatorBase<OperationType> {
 public:
  TranslateTransformInterpolatorBase(
      RelativeTo relativeTo,
      const std::string &relativeProperty,
      const UnitValue &defaultValue);

 protected:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;

  OperationType interpolate(
      const double progress,
      const OperationType &fromOperation,
      const OperationType &toOperation,
      const InterpolationUpdateContext &context) const override;
};

class TranslateXTransformInterpolator
    : public TranslateTransformInterpolatorBase<TranslateXOperation> {
 public:
  TranslateXTransformInterpolator(
      RelativeTo relativeTo,
      const std::string &relativeProperty,
      const UnitValue &defaultValue)
      : TranslateTransformInterpolatorBase(
            relativeTo,
            relativeProperty,
            defaultValue) {}
};

class TranslateYTransformInterpolator
    : public TranslateTransformInterpolatorBase<TranslateYOperation> {
 public:
  TranslateYTransformInterpolator(
      RelativeTo relativeTo,
      const std::string &relativeProperty,
      const UnitValue &defaultValue)
      : TranslateTransformInterpolatorBase(
            relativeTo,
            relativeProperty,
            defaultValue) {}
};

} // namespace reanimated
