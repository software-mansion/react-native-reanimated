#include <reanimated/CSS/interpolation/properties/TransformsStyleInterpolator.h>

namespace reanimated {

const ValueUnit Zero = ValueUnit(0, UnitType::Point);
const ValueUnit One = ValueUnit(1, UnitType::Point);

static ValueUnit parseTransformValue(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  if (value.isNumber()) {
    return ValueUnit(value.asNumber(), UnitType::Point);
  } else if (value.isString()) {
    std::string strValue = value.asString(rt).utf8(rt);
    if (strValue.back() == '%') {
      // Remove the '%' symbol and convert to a proportion
      strValue.pop_back();
      return ValueUnit(std::stod(strValue), UnitType::Percent);
    }
    return ValueUnit(std::stod(strValue), UnitType::Point);
  }
  return Zero;
}

static ValueUnit parseRotationValue(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isString()) {
    std::string rotationStr = value.asString(rt).utf8(rt);
    if (rotationStr.find("deg") != std::string::npos) {
      // Strip 'deg' and convert to radians
      return ValueUnit(
          std::stod(rotationStr.substr(0, rotationStr.size() - 3)) * M_PI /
              180.0,
          UnitType::Point);
    } else if (rotationStr.find("rad") != std::string::npos) {
      // Strip 'rad' and use the value as is
      return ValueUnit(
          std::stod(rotationStr.substr(0, rotationStr.size() - 3)),
          UnitType::Point);
    }
  }
  return Zero;
}

const std::unordered_map<
    std::string,
    std::function<TransformOperation(jsi::Runtime &, const jsi::Value &)>>
    TransformsStyleInterpolator::transformOperations_ = {
        {"translateX",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Translate,
               parseTransformValue(rt, value),
               Zero,
               Zero};
         }},
        {"translateY",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Translate,
               Zero,
               parseTransformValue(rt, value),
               Zero};
         }},
        {"perspective",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Perspective,
               ValueUnit(value.asNumber(), UnitType::Point),
               Zero,
               Zero};
         }},
        {"rotate",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           if (!value.isObject()) {
             return TransformOperation{
                 TransformOperationType::Rotate,
                 Zero,
                 Zero,
                 parseRotationValue(rt, value)};
           }

           const auto &rotationsArray = value.asObject(rt).asArray(rt);
           std::vector<ValueUnit> rotations;
           const auto rotationsCount =
               std::min(static_cast<size_t>(3), rotationsArray.size(rt));

           for (size_t i = 0; i < rotationsCount; ++i) {
             rotations.push_back(
                 parseRotationValue(rt, rotationsArray.getValueAtIndex(rt, i)));
           }

           return TransformOperation{
               TransformOperationType::Rotate,
               rotations.size() > 0 ? rotations[0] : Zero,
               rotations.size() > 1 ? rotations[1] : Zero,
               rotations.size() > 2 ? rotations[2] : Zero};
         }},
        {"rotateX",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Rotate,
               parseRotationValue(rt, value),
               Zero,
               Zero};
         }},
        {"rotateY",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Rotate,
               Zero,
               parseRotationValue(rt, value),
               Zero};
         }},
        {"rotateZ",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Rotate,
               Zero,
               Zero,
               parseRotationValue(rt, value)};
         }},
        {"scale",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Scale,
               ValueUnit(value.asNumber(), UnitType::Point),
               ValueUnit(value.asNumber(), UnitType::Point),
               ValueUnit(value.asNumber(), UnitType::Point)};
         }},
        {"scaleX",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Scale,
               ValueUnit(value.asNumber(), UnitType::Point),
               One,
               One};
         }},
        {"scaleY",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Scale,
               One,
               ValueUnit(value.asNumber(), UnitType::Point),
               One};
         }},
        {"skewX",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Skew,
               parseRotationValue(rt, value),
               Zero,
               Zero};
         }},
        {"skewY",
         [](jsi::Runtime &rt, const jsi::Value &value) {
           return TransformOperation{
               TransformOperationType::Skew,
               Zero,
               parseRotationValue(rt, value),
               Zero};
         }},
};

TransformsStyleInterpolator::TransformsStyleInterpolator(
    const std::optional<Transform> &defaultValue,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : ValueInterpolator<Transform>(
          defaultValue,
          viewStylesRepository,
          propertyPath),
      viewStylesRepository_(viewStylesRepository) {}

Transform TransformsStyleInterpolator::prepareKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  // Use this multiplication to return a copy of the defaultStyleValue_ if it
  // exists
  Transform transform = defaultStyleValue_.value_or(Transform::Identity()) *
      Transform::Identity();

  const auto &transformsArray = value.asObject(rt).asArray(rt);
  const auto transformsCount = transformsArray.size(rt);

  if (transformsCount == 1) {
    const auto propertyName = transformsArray.getPropertyNames(rt)
                                  .getValueAtIndex(rt, 0)
                                  .asString(rt)
                                  .utf8(rt);
    if (propertyName == "matrix") {
      return parseTransformMatrix(
          rt, transformsArray.getValueAtIndex(rt, 0).asObject(rt).asArray(rt));
    }
  }

  for (size_t i = 0; i < transformsCount; ++i) {
    const auto transformObject =
        transformsArray.getValueAtIndex(rt, i).asObject(rt);
    const auto propertyNames = transformObject.getPropertyNames(rt);

    if (propertyNames.size(rt) != 1) {
      throw std::invalid_argument(
          "[Reanimated] Transform object should have exactly one property");
    }

    const auto propertyName =
        propertyNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
    const auto propertyValue =
        transformObject.getProperty(rt, propertyName.c_str());

    if (propertyName == "matrix") {
      continue;
    }

    transform.operations.emplace_back(
        getTransformOperation(rt, transform, propertyName, propertyValue));
  }

  return transform;
}

jsi::Value TransformsStyleInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const Transform &value) const {
  const auto matrixSize = value.matrix.size();
  jsi::Array matrixArray(rt, matrixSize);

  for (size_t i = 0; i < matrixSize; ++i) {
    matrixArray.setValueAtIndex(rt, i, static_cast<double>(value.matrix.at(i)));
  }

  jsi::Object matrixTransform(rt);
  matrixTransform.setProperty(rt, "matrix", matrixArray);
  jsi::Array transformsArray(rt, 1);
  transformsArray.setValueAtIndex(rt, 0, matrixTransform);
  return transformsArray;
}

Transform TransformsStyleInterpolator::interpolate(
    double localProgress,
    const Transform &fromValue,
    const Transform &toValue,
    const InterpolationUpdateContext context) const {
  const auto width =
      viewStylesRepository_->getNodeProp(context.node, "width").asNumber();
  const auto height =
      viewStylesRepository_->getNodeProp(context.node, "height").asNumber();

  return Transform::Interpolate(
      localProgress, fromValue, toValue, {width, height});
}

TransformOperation TransformsStyleInterpolator::getTransformOperation(
    jsi::Runtime &rt,
    const Transform &currentTransform,
    const std::string &propertyName,
    const jsi::Value &transformValue) const {
  auto it = transformOperations_.find(propertyName);
  if (it != transformOperations_.end()) {
    return it->second(rt, transformValue);
  }

  throw std::invalid_argument(
      "[Reanimated] Unknown transform operation: " + propertyName);
}

Transform TransformsStyleInterpolator::parseTransformMatrix(
    jsi::Runtime &rt,
    const jsi::Array &matrixArray) const {
  const auto TRANSFORM_MATRIX_SIZE = 16;
  Transform transform = Transform::Identity();

  if (matrixArray.size(rt) != TRANSFORM_MATRIX_SIZE) {
    throw std::invalid_argument(
        "[Reanimated] Matrix transform should have exactly 16 elements");
  }

  for (size_t i = 0; i < TRANSFORM_MATRIX_SIZE; ++i) {
    transform.matrix[i] = matrixArray.getValueAtIndex(rt, i).asNumber();
  }

  return transform;
}

} // namespace reanimated
