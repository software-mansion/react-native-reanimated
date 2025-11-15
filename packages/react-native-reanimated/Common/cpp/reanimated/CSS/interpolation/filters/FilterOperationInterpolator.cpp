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
FilterOperationInterpolator<TOperation>::FilterOperationInterpolator(
    const std::shared_ptr<TOperation> &defaultOperation)
    : StyleOperationInterpolatorBase<TOperation>(defaultOperation) {}

template <ResolvableFilterOp TOperation>
FilterOperationInterpolator<TOperation>::FilterOperationInterpolator(
    const std::shared_ptr<TOperation> &defaultOperation,
    ResolvableValueInterpolatorConfig config)
    : StyleOperationInterpolatorBase<TOperation>(defaultOperation, std::move(config)) {}

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
