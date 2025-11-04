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

namespace {
std::string createConversionErrorMessage(const FilterOp fromType, const FilterOp toType) {
  return "[Reanimated] Cannot convert filter operation of type: " + getOperationNameFromType(fromType) +
      " to type: " + getOperationNameFromType(toType);
}
} // namespace

FilterOperation::FilterOperation(FilterOp value) : type(value) {}

bool FilterOperation::canConvertTo(const FilterOp targetType) const {
  return false;
}

void FilterOperation::assertCanConvertTo(const FilterOp targetType) const {
  if (!canConvertTo(targetType)) {
    throw std::invalid_argument(createConversionErrorMessage(type, targetType));
  }
}

FilterOperations FilterOperation::convertTo(const FilterOp targetType) const {
  throw std::invalid_argument(createConversionErrorMessage(type, targetType));
}

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
    case FilterOp::blur:
      return std::make_shared<BlurOperation>(propertyValue.asNumber());
    case FilterOp::brightness:
      return std::make_shared<BrightnessOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::contrast:
      return std::make_shared<ContrastOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::dropShadow:
      return std::make_shared<DropShadowOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::grayscale:
      return std::make_shared<GrayscaleOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::hueRotate:
      return std::make_shared<HueRotateOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::invert:
      return std::make_shared<InvertOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::opacity:
      return std::make_shared<OpacityOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::saturate:
      return std::make_shared<SaturateOperation>(propertyValue.asString(rt).utf8(rt));
    case FilterOp::sepia:
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
    case FilterOp::blur:
      return std::make_shared<BlurOperation>(propertyValue.getDouble());
    case FilterOp::brightness:
      return std::make_shared<BrightnessOperation>(propertyValue.getString());
    case FilterOp::contrast:
      return std::make_shared<ContrastOperation>(propertyValue.getString());
    case FilterOp::dropShadow:
      return std::make_shared<DropShadowOperation>(propertyValue.getString());
    case FilterOp::grayscale:
      return std::make_shared<GrayscaleOperation>(propertyValue.getString());
    case FilterOp::hueRotate:
      return std::make_shared<HueRotateOperation>(propertyValue.getDouble());
    case FilterOp::invert:
      return std::make_shared<InvertOperation>(propertyValue.getDouble());
    case FilterOp::opacity:
      return std::make_shared<OpacityOperation>(propertyValue.getDouble());
    case FilterOp::saturate:
      return std::make_shared<SaturateOperation>(propertyValue.getDouble());
    case FilterOp::sepia:
      return std::make_shared<SepiaOperation>(propertyValue.getDouble());
    default:
      throw std::invalid_argument("[Reanimated] Unknown filter operation: " + propertyName);
  }
}

folly::dynamic FilterOperation::toDynamic() const {
  return folly::dynamic::object(getOperationName(), valueToDynamic());
}

// FilterOperationBase implementation
template <FilterOp TOperation, typename TValue>
FilterOperationBase<TOperation, TValue>::FilterOperationBase(TValue value)
    : FilterOperation(TOperation), value(std::move(value)) {}

template <FilterOp TOperation, typename TValue>
bool FilterOperationBase<TOperation, TValue>::operator==(const FilterOperation &other) const {
  if (type != other.type) {
    return false;
  }
  const auto &otherOperation = static_cast<const FilterOperationBase<TOperation, TValue> &>(other);
  return value == otherOperation.value;
}

template struct FilterOperationBase<FilterOp::blur, CSSDouble>;
template struct FilterOperationBase<FilterOp::brightness, CSSDouble>;
template struct FilterOperationBase<FilterOp::contrast, CSSDouble>;
template struct FilterOperationBase<FilterOp::dropShadow, CSSDropShadow>;
template struct FilterOperationBase<FilterOp::grayscale, CSSDouble>;
template struct FilterOperationBase<FilterOp::hueRotate, CSSAngle>;
template struct FilterOperationBase<FilterOp::invert, CSSDouble>;
template struct FilterOperationBase<FilterOp::opacity, CSSDouble>;
template struct FilterOperationBase<FilterOp::saturate, CSSDouble>;
template struct FilterOperationBase<FilterOp::sepia, CSSDouble>;

} // namespace reanimated::css
