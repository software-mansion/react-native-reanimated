#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/complex/CSSDropShadow.h>

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

#include <utility>

namespace reanimated::css {

FilterOperation::FilterOperation(FilterOp type) : StyleOperation(static_cast<uint8_t>(type)) {}

std::string FilterOperation::getOperationName() const {
  return getFilterOperationName(static_cast<FilterOp>(type));
}

std::shared_ptr<FilterOperation> FilterOperation::fromJSIValue(jsi::Runtime &rt, const jsi::Value &value) {
  if (!value.isObject()) {
    throw std::invalid_argument("[Reanimated] FilterOperation must be an object.");
  }

  jsi::Object obj = value.asObject(rt);
  auto propertyNames = obj.getPropertyNames(rt);

  if (propertyNames.size(rt) != 1) {
    throw std::invalid_argument("[Reanimated] FilterOperation must have exactly one property.");
  }

  const auto propertyName = propertyNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
  const auto propertyValue = obj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));
  FilterOp operationType = getFilterOperationType(propertyName);

  switch (operationType) {
    case FilterOp::Blur:
      return std::make_shared<BlurOperation>(propertyValue.asNumber());
    case FilterOp::Brightness:
      return std::make_shared<BrightnessOperation>(propertyValue.asNumber());
    case FilterOp::Contrast:
      return std::make_shared<ContrastOperation>(propertyValue.asNumber());
    case FilterOp::DropShadow:
      return std::make_shared<DropShadowOperation>(CSSDropShadow(rt, propertyValue));
    case FilterOp::Grayscale:
      return std::make_shared<GrayscaleOperation>(propertyValue.asNumber());
    case FilterOp::HueRotate:
      return std::make_shared<HueRotateOperation>(propertyValue.asNumber());
    case FilterOp::Invert:
      return std::make_shared<InvertOperation>(propertyValue.asNumber());
    case FilterOp::Opacity:
      return std::make_shared<OpacityOperation>(propertyValue.asNumber());
    case FilterOp::Saturate:
      return std::make_shared<SaturateOperation>(propertyValue.asNumber());
    case FilterOp::Sepia:
      return std::make_shared<SepiaOperation>(propertyValue.asNumber());
    default:
      throw std::invalid_argument("[Reanimated] Unknown filter operation: " + propertyName);
  }
}

std::shared_ptr<FilterOperation> FilterOperation::fromDynamic(const folly::dynamic &value) {
  if (!value.isObject()) {
    throw std::invalid_argument("[Reanimated] FilterOperation must be an object.");
  }

  auto &obj = value;
  if (obj.size() != 1) {
    throw std::invalid_argument("[Reanimated] FilterOperation must have exactly one property.");
  }

  auto propertyName = obj.items().begin()->first.getString();
  auto propertyValue = obj.items().begin()->second;
  FilterOp operationType = getFilterOperationType(propertyName);

  switch (operationType) {
    case FilterOp::Blur:
      return std::make_shared<BlurOperation>(propertyValue.getDouble());
    case FilterOp::Brightness:
      return std::make_shared<BrightnessOperation>(propertyValue.getDouble());
    case FilterOp::Contrast:
      return std::make_shared<ContrastOperation>(propertyValue.getDouble());
    case FilterOp::DropShadow:
      return std::make_shared<DropShadowOperation>(CSSDropShadow(propertyValue));
    case FilterOp::Grayscale:
      return std::make_shared<GrayscaleOperation>(propertyValue.getDouble());
    case FilterOp::HueRotate:
      return std::make_shared<HueRotateOperation>(propertyValue.getDouble());
    case FilterOp::Invert:
      return std::make_shared<InvertOperation>(propertyValue.getDouble());
    case FilterOp::Opacity:
      return std::make_shared<OpacityOperation>(propertyValue.getDouble());
    case FilterOp::Saturate:
      return std::make_shared<SaturateOperation>(propertyValue.getDouble());
    case FilterOp::Sepia:
      return std::make_shared<SepiaOperation>(propertyValue.getDouble());
    default:
      throw std::invalid_argument("[Reanimated] Unknown filter operation: " + propertyName);
  }
}

// FilterOperationBase implementation
template <FilterOp TOperation, CSSValueDerived TValue>
FilterOperationBase<TOperation, TValue>::FilterOperationBase(TValue value)
    : FilterOperation(TOperation), value(std::move(value)) {}

template <FilterOp TOperation, CSSValueDerived TValue>
folly::dynamic FilterOperationBase<TOperation, TValue>::valueToDynamic() const {
  return value.toDynamic();
}

template <FilterOp TOperation, CSSValueDerived TValue>
bool FilterOperationBase<TOperation, TValue>::areValuesEqual(const StyleOperation &other) const {
  return value == static_cast<const FilterOperationBase<TOperation, TValue> &>(other).value;
}

template struct FilterOperationBase<FilterOp::Blur, CSSDouble>;
template struct FilterOperationBase<FilterOp::Brightness, CSSDouble>;
template struct FilterOperationBase<FilterOp::Contrast, CSSDouble>;
template struct FilterOperationBase<FilterOp::DropShadow, CSSDropShadow>;
template struct FilterOperationBase<FilterOp::Grayscale, CSSDouble>;
template struct FilterOperationBase<FilterOp::HueRotate, CSSDouble>;
template struct FilterOperationBase<FilterOp::Invert, CSSDouble>;
template struct FilterOperationBase<FilterOp::Opacity, CSSDouble>;
template struct FilterOperationBase<FilterOp::Saturate, CSSDouble>;
template struct FilterOperationBase<FilterOp::Sepia, CSSDouble>;

} // namespace reanimated::css
