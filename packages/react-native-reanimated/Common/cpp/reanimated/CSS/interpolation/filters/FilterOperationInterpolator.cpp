#include <reanimated/CSS/interpolation/filters/FilterOperationInterpolator.h>

#include <reanimated/CSS/interpolation/filters/operations/blur.h>
#include <reanimated/CSS/interpolation/filters/operations/brightness.h>
#include <reanimated/CSS/interpolation/filters/operations/contrast.h>
#include <reanimated/CSS/interpolation/filters/operations/dropShadow.h>
#include <reanimated/CSS/interpolation/filters/operations/grayscale.h>
#include <reanimated/CSS/interpolation/filters/operations/hueRotate.h>
#include <reanimated/CSS/interpolation/filters/operations/invert.h>
#include <reanimated/CSS/interpolation/filters/operations/opacity.h>
#include <reanimated/CSS/interpolation/filters/operations/saturate.h>
#include <reanimated/CSS/interpolation/filters/operations/sepia.h>

namespace reanimated::css {

template <typename TOperation>
std::unique_ptr<StyleOperation> FilterOperationInterpolator<TOperation>::interpolate(
    double progress,
    const std::shared_ptr<StyleOperation> &from,
    const std::shared_ptr<StyleOperation> &to,
    const StyleOperationsInterpolationContext &context) const {
  const auto &fromOp = std::static_pointer_cast<TOperation>(from);
  const auto &toOp = std::static_pointer_cast<TOperation>(to);
  return std::make_unique<TOperation>(fromOp->value.interpolate(progress, toOp->value));
}

template class FilterOperationInterpolator<BlurOperation>;
template class FilterOperationInterpolator<BrightnessOperation>;
template class FilterOperationInterpolator<ContrastOperation>;
template class FilterOperationInterpolator<DropShadowOperation>;
template class FilterOperationInterpolator<GrayscaleOperation>;
template class FilterOperationInterpolator<HueRotateOperation>;
template class FilterOperationInterpolator<InvertOperation>;
template class FilterOperationInterpolator<OpacityOperation>;
template class FilterOperationInterpolator<SaturateOperation>;
template class FilterOperationInterpolator<SepiaOperation>;

} // namespace reanimated::css
