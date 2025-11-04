#include <reanimated/CSS/interpolation/filters/FilterOperation.h>

#include <reanimated/CSS/common/filters/FilterOp.h>
#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/complex/CSSDropShadow.h>

#include <reanimated/CSS/interpolation/filters/operations/blur.h>
#include <reanimated/CSS/interpolation/filters/operations/brightness.h>
#include <reanimated/CSS/interpolation/filters/operations/contrast.h>
#include <reanimated/CSS/interpolation/filters/operations/dropshadow.h>
#include <reanimated/CSS/interpolation/filters/operations/grayscale.h>
#include <reanimated/CSS/interpolation/filters/operations/huerotate.h>
#include <reanimated/CSS/interpolation/filters/operations/invert.h>
#include <reanimated/CSS/interpolation/filters/operations/opacity.h>
#include <reanimated/CSS/interpolation/filters/operations/saturate.h>
#include <reanimated/CSS/interpolation/filters/operations/sepia.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

FilterOperation::FilterOperation(FilterOp value) : type(value) {}

std::string FilterOperation::getOperationName() const {
  return getOperationNameFromType(type);
}

bool FilterOperation::shouldResolve() const {
  return false;
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
      return std::make_shared<BrightnessOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::Contrast:
      return std::make_shared<ContrastOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::DropShadow:
      return std::make_shared<DropShadowOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::Grayscale:
      return std::make_shared<GrayscaleOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::HueRotate:
      return std::make_shared<HueRotateOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::Invert:
      return std::make_shared<InvertOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::Opacity:
      return std::make_shared<OpacityOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::Saturate:
      return std::make_shared<SaturateOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::Sepia:
      return std::make_shared<SepiaOperation>(propertyValue.asString(rt).utf8(rt));
    default:
      throw std::invalid_argument("[Reanimated] Unknown transform operation: " + propertyName);
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
      return std::make_shared<BrightnessOperation>(propertyValue.getString());
    case FilterOp::Contrast:
      return std::make_shared<ContrastOperation>(propertyValue.getString());
    case FilterOp::DropShadow:
      return std::make_shared<DropShadowOperation>(propertyValue.getString());
    case FilterOp::Grayscale:
      return std::make_shared<GrayscaleOperation>(propertyValue.getString());
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

folly::dynamic FilterOperation::toDynamic() const {
  return folly::dynamic::object(getOperationName(), valueToDynamic());
}

// FilterOperationBase implementation
template <FilterOp TOperation, CSSValueDerived TValue>
FilterOperationBase<TOperation, TValue>::FilterOperationBase(TValue value)
    : FilterOperation(TOperation), value(std::move(value)) {}

template <FilterOp TOperation, CSSValueDerived TValue>
bool FilterOperationBase<TOperation, TValue>::operator==(const FilterOperation &other) const {
  if (type != other.type) {
    return false;
  }
  const auto &otherOperation = static_cast<const FilterOperationBase<TOperation, TValue> &>(other);
  return value == otherOperation.value;
}

template <FilterOp TOperation, CSSValueDerived TValue>
folly::dynamic FilterOperationBase<TOperation, TValue>::valueToDynamic() const {
  return value.toDynamic();
}

template struct FilterOperationBase<FilterOp::Blur, CSSDouble>;
template struct FilterOperationBase<FilterOp::Brightness, CSSDouble>;
template struct FilterOperationBase<FilterOp::Contrast, CSSDouble>;
template struct FilterOperationBase<FilterOp::DropShadow, CSSDropShadow>;
template struct FilterOperationBase<FilterOp::Grayscale, CSSDouble>;
template struct FilterOperationBase<FilterOp::HueRotate, CSSAngle>;
template struct FilterOperationBase<FilterOp::Invert, CSSDouble>;
template struct FilterOperationBase<FilterOp::Opacity, CSSDouble>;
template struct FilterOperationBase<FilterOp::Saturate, CSSDouble>;
template struct FilterOperationBase<FilterOp::Sepia, CSSDouble>;

} // namespace reanimated::css
