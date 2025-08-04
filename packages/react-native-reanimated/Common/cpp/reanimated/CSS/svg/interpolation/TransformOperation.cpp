#include <reanimated/CSS/svg/interpolation/TransformOperation.h>

namespace reanimated::css {

std::shared_ptr<TransformOperation> TransformOperation::from(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  auto parsedOperation = parseOperation(rt, value);
  const auto &[operationType, propertyValue] = parsedOperation;

  switch (operationType) {
    case TransformOperationType::TranslateX: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateXOperation<SVGLength>>(
            propertyValue.asNumber());
      }
      return std::make_shared<TranslateXOperation<SVGLength>>(
          propertyValue.asString(rt).utf8(rt));
    }
    case TransformOperationType::TranslateY: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateYOperation<SVGLength>>(
            propertyValue.asNumber());
      }
      return std::make_shared<TranslateYOperation<SVGLength>>(
          propertyValue.asString(rt).utf8(rt));
    }
    default:
      return TransformOperation::from(rt, std::move(parsedOperation));
  }
}

std::shared_ptr<TransformOperation> TransformOperation::from(
    const folly::dynamic &value) {
  auto parsedOperation = parseOperation(value);
  const auto &[operationType, propertyValue] = parsedOperation;

  switch (operationType) {
    case TransformOperationType::TranslateX: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateXOperation<SVGLength>>(
            propertyValue.getDouble());
      }
      return std::make_shared<TranslateXOperation<SVGLength>>(
          propertyValue.getString());
    }
    case TransformOperationType::TranslateY: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateYOperation<SVGLength>>(
            propertyValue.getDouble());
      }
      return std::make_shared<TranslateYOperation<SVGLength>>(
          propertyValue.getString());
    }
    default:
      return TransformOperation::from(std::move(parsedOperation));
  }
}

template struct TranslateXOperation<SVGLength>;
template struct TranslateYOperation<SVGLength>;

} // namespace reanimated::css
