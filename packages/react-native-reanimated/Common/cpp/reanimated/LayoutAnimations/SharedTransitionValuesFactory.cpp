#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/graphicsConversions.h>
#include <react/renderer/graphics/Transform.h>
#include <reanimated/LayoutAnimations/SharedTransitionValuesFactory.h>

#include <string>
#include <vector>

using namespace facebook;

namespace reanimated {

void SharedTransitionValuesFactory::setProperty(jsi::Object &values, const char *name, jsi::Value &&value) {
  values.setProperty(rt_, name, value);
}

jsi::Object SharedTransitionValuesFactory::create(const ShadowView &sourceView, const ShadowView &targetView) {
  const auto &sourceViewProps = static_cast<const ViewProps &>(*sourceView.props);
  const auto &targetViewProps = static_cast<const ViewProps &>(*targetView.props);

  jsi::Object values(rt_);

  diffFrame(values, sourceView, targetView);
  diffOpacity(values, sourceViewProps, targetViewProps);
  diffBackgroundColor(values, sourceViewProps, targetViewProps);
  diffTransform(values, sourceViewProps, targetViewProps);
  diffTransformOrigin(values, sourceView, targetView, sourceViewProps, targetViewProps);
  diffShadow(values, sourceViewProps, targetViewProps);
  diffBorder(values, sourceViewProps, targetViewProps);

  return values;
}

void SharedTransitionValuesFactory::diffFrame(
    jsi::Object &values,
    const ShadowView &sourceView,
    const ShadowView &targetView) {
  const auto &sourceFrame = sourceView.layoutMetrics.frame;
  const auto &targetFrame = targetView.layoutMetrics.frame;
  const auto &sourceOrigin = sourceFrame.origin;
  const auto &targetOrigin = targetFrame.origin;

  setProperty(values, "currentOriginX", jsi::Value(sourceOrigin.x));
  setProperty(values, "targetOriginX", jsi::Value(targetOrigin.x));
  setProperty(values, "currentGlobalOriginX", jsi::Value(sourceOrigin.x));
  setProperty(values, "targetGlobalOriginX", jsi::Value(targetOrigin.x));

  setProperty(values, "currentOriginY", jsi::Value(sourceOrigin.y));
  setProperty(values, "targetOriginY", jsi::Value(targetOrigin.y));
  setProperty(values, "currentGlobalOriginY", jsi::Value(sourceOrigin.y));
  setProperty(values, "targetGlobalOriginY", jsi::Value(targetOrigin.y));

  const auto &sourceSize = sourceFrame.size;
  const auto &targetSize = targetFrame.size;

  setProperty(values, "currentWidth", jsi::Value(sourceSize.width));
  setProperty(values, "targetWidth", jsi::Value(targetSize.width));

  setProperty(values, "currentHeight", jsi::Value(sourceSize.height));
  setProperty(values, "targetHeight", jsi::Value(targetSize.height));
}

void SharedTransitionValuesFactory::diffOpacity(
    jsi::Object &values,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  setProperty(values, "currentOpacity", jsi::Value(sourceViewProps.opacity));
  setProperty(values, "targetOpacity", jsi::Value(targetViewProps.opacity));
}

void SharedTransitionValuesFactory::diffBackgroundColor(
    jsi::Object &values,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  setProperty(
      values, "currentBackgroundColor", jsi::String::createFromUtf8(rt_, react::toString(sourceViewProps.backgroundColor)));
  setProperty(
      values, "targetBackgroundColor", jsi::String::createFromUtf8(rt_, react::toString(targetViewProps.backgroundColor)));
}

void SharedTransitionValuesFactory::diffTransform(
    jsi::Object &values,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  const auto &sourceJsiOperations = getTransformOperationsFromProps(sourceViewProps);
  const auto &targetJsiOperations = getTransformOperationsFromProps(targetViewProps);

  if (sourceJsiOperations.size() == 1 && targetJsiOperations.size() == 1 &&
      sourceJsiOperations[0].currentValue.hasProperty(rt_, "matrix") &&
      targetJsiOperations[0].currentValue.hasProperty(rt_, "matrix")) {
    jsi::Array sourceTransforms(rt_, 1), targetTransforms(rt_, 1);
    sourceTransforms.setValueAtIndex(rt_, 0, sourceJsiOperations[0].currentValue);
    targetTransforms.setValueAtIndex(rt_, 0, targetJsiOperations[0].currentValue);
    setProperty(values, "currentTransform", std::move(sourceTransforms));
    setProperty(values, "targetTransform", std::move(targetTransforms));
    return;
  }

  jsi::Array sourceTransforms(rt_, sourceJsiOperations.size() + targetJsiOperations.size());
  jsi::Array targetTransforms(rt_, sourceJsiOperations.size() + targetJsiOperations.size());
  for (size_t i = 0; i < sourceJsiOperations.size(); i++) {
    sourceTransforms.setValueAtIndex(rt_, i, sourceJsiOperations[i].currentValue);
    targetTransforms.setValueAtIndex(rt_, i, sourceJsiOperations[i].defaultValue);
  }
  for (size_t i = 0; i < targetJsiOperations.size(); i++) {
    size_t index = i + sourceJsiOperations.size();
    sourceTransforms.setValueAtIndex(rt_, index, targetJsiOperations[i].defaultValue);
    targetTransforms.setValueAtIndex(rt_, index, targetJsiOperations[i].currentValue);
  }
  setProperty(values, "currentTransform", std::move(sourceTransforms));
  setProperty(values, "targetTransform", std::move(targetTransforms));
}

std::vector<TransformOperationWithDefault> SharedTransitionValuesFactory::getTransformOperationsFromProps(
    const ViewProps &props) {
  std::vector<TransformOperationWithDefault> jsiOperations;
  const auto &operations = props.transform.operations;

  if (operations.size() == 1 && operations[0].type == react::TransformOperationType::Arbitrary) {
    jsi::Array currentMatrix(rt_, 16), defaultMatrix(rt_, 16);
    for (int i = 0; i < 16; i++) {
      currentMatrix.setValueAtIndex(rt_, i, props.transform.matrix[i]);
      defaultMatrix.setValueAtIndex(rt_, i, i % 5 == 0 ? 1 : 0);
    }

    jsi::Object currentValue(rt_), defaultValue(rt_);
    currentValue.setProperty(rt_, "matrix", currentMatrix);
    defaultValue.setProperty(rt_, "matrix", defaultMatrix);
    jsiOperations.emplace_back(currentValue, defaultValue);
  }

  for (const auto &operation : operations) {
    switch (operation.type) {
      case react::TransformOperationType::Perspective: {
        maybeAddOperationToDiff("perspective", operation.x.value, 1, jsiOperations);
      } break;

      case react::TransformOperationType::Scale: {
        maybeAddOperationToDiff("scaleX", operation.x.value, 1, jsiOperations);
        maybeAddOperationToDiff("scaleY", operation.y.value, 1, jsiOperations);
        maybeAddOperationToDiff("scaleZ", operation.z.value, 1, jsiOperations);
      } break;

      case react::TransformOperationType::Translate: {
        maybeAddOperationToDiff("translateX", operation.x.value, 0, jsiOperations);
        maybeAddOperationToDiff("translateY", operation.y.value, 0, jsiOperations);
        maybeAddOperationToDiff("translateZ", operation.z.value, 0, jsiOperations);
      } break;

      case react::TransformOperationType::Rotate: {
        maybeAddOperationToDiff("rotateX", operation.x.value, 0, jsiOperations);
        maybeAddOperationToDiff("rotateY", operation.y.value, 0, jsiOperations);
        maybeAddOperationToDiff("rotateZ", operation.z.value, 0, jsiOperations);
      } break;

      case react::TransformOperationType::Skew: {
        maybeAddOperationToDiff("skewX", operation.x.value, 0, jsiOperations);
        maybeAddOperationToDiff("skewY", operation.y.value, 0, jsiOperations);
        maybeAddOperationToDiff("skewZ", operation.z.value, 0, jsiOperations);
      } break;

      default: {
      }
    }
  }
  return jsiOperations;
}

void SharedTransitionValuesFactory::maybeAddOperationToDiff(
    const char *name,
    float value,
    float defaultValue,
    std::vector<TransformOperationWithDefault> &jsiOperations) {
  if (value == defaultValue) {
    return;
  }
  jsi::Object jsiValue(rt_);
  jsiValue.setProperty(rt_, name, value);
  jsi::Object jsiDefaultDefault(rt_);
  jsiDefaultDefault.setProperty(rt_, name, defaultValue);
  jsiOperations.emplace_back(jsiValue, jsiDefaultDefault);
}

void SharedTransitionValuesFactory::diffTransformOrigin(
    jsi::Object &values,
    const ShadowView &sourceView,
    const ShadowView &targetView,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  addTransformOriginToDiff(values, sourceViewProps.transformOrigin, sourceView, "currentTransformOrigin");
  addTransformOriginToDiff(values, targetViewProps.transformOrigin, targetView, "targetTransformOrigin");
}

void SharedTransitionValuesFactory::addTransformOriginToDiff(
    jsi::Object &values,
    const TransformOrigin &transformOrigin,
    const ShadowView &view,
    const char *name) {
  jsi::Array transformOriginJsi(rt_, 3);

  const auto &viewSize = view.layoutMetrics.frame.size;

  if (transformOrigin.xy[0].unit == UnitType::Percent) {
    transformOriginJsi.setValueAtIndex(rt_, 0, viewSize.width * transformOrigin.xy[0].value / 100);
  } else if (transformOrigin.xy[0].unit == UnitType::Undefined) {
    // Unset transformOrigin defaults to "50% 50%" (view center), per CSS.
    transformOriginJsi.setValueAtIndex(rt_, 0, viewSize.width * 0.5);
  } else {
    transformOriginJsi.setValueAtIndex(rt_, 0, transformOrigin.xy[0].value);
  }

  if (transformOrigin.xy[1].unit == UnitType::Percent) {
    transformOriginJsi.setValueAtIndex(rt_, 1, viewSize.height * transformOrigin.xy[1].value / 100);
  } else if (transformOrigin.xy[1].unit == UnitType::Undefined) {
    transformOriginJsi.setValueAtIndex(rt_, 1, viewSize.height * 0.5);
  } else {
    transformOriginJsi.setValueAtIndex(rt_, 1, transformOrigin.xy[1].value);
  }

  transformOriginJsi.setValueAtIndex(rt_, 2, transformOrigin.z);

  setProperty(values, name, std::move(transformOriginJsi));
}

void SharedTransitionValuesFactory::diffShadow(
    jsi::Object &values,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  const auto &sourceBoxShadows = getBoxShadowsFromProps(sourceViewProps);
  const auto &targetBoxShadows = getBoxShadowsFromProps(targetViewProps);

  if (sourceBoxShadows.size() == targetBoxShadows.size()) {
    const size_t size = sourceBoxShadows.size();
    jsi::Array sourceBoxShadowArray(rt_, size), targetBoxShadowArray(rt_, size);
    for (int i = 0; i < size; i++) {
      sourceBoxShadowArray.setValueAtIndex(rt_, i, sourceBoxShadows[i].currentValue);
      targetBoxShadowArray.setValueAtIndex(rt_, i, targetBoxShadows[i].currentValue);
    }
    setProperty(values, "currentBoxShadow", std::move(sourceBoxShadowArray));
    setProperty(values, "targetBoxShadow", std::move(targetBoxShadowArray));
  } else {
    const size_t size = sourceBoxShadows.size() + targetBoxShadows.size();
    jsi::Array sourceBoxShadowArray(rt_, size), targetBoxShadowArray(rt_, size);
    for (size_t i = 0; i < sourceBoxShadows.size(); i++) {
      sourceBoxShadowArray.setValueAtIndex(rt_, i, sourceBoxShadows[i].currentValue);
      targetBoxShadowArray.setValueAtIndex(rt_, i, sourceBoxShadows[i].defaultValue);
    }
    for (size_t i = 0; i < targetBoxShadows.size(); i++) {
      size_t index = i + sourceBoxShadows.size();
      sourceBoxShadowArray.setValueAtIndex(rt_, index, targetBoxShadows[i].defaultValue);
      targetBoxShadowArray.setValueAtIndex(rt_, index, targetBoxShadows[i].currentValue);
    }
    setProperty(values, "currentBoxShadow", std::move(sourceBoxShadowArray));
    setProperty(values, "targetBoxShadow", std::move(targetBoxShadowArray));
  }

  setProperty(values, "currentShadowColor", jsi::String::createFromUtf8(rt_, toString(sourceViewProps.shadowColor)));
  setProperty(values, "targetShadowColor", jsi::String::createFromUtf8(rt_, toString(targetViewProps.shadowColor)));

  {
    jsi::Object sourceShadowOffset(rt_), targetShadowOffset(rt_);
    sourceShadowOffset.setProperty(rt_, "width", sourceViewProps.shadowOffset.width);
    sourceShadowOffset.setProperty(rt_, "height", sourceViewProps.shadowOffset.height);
    targetShadowOffset.setProperty(rt_, "width", targetViewProps.shadowOffset.width);
    targetShadowOffset.setProperty(rt_, "height", targetViewProps.shadowOffset.height);
    setProperty(values, "currentShadowOffset", std::move(sourceShadowOffset));
    setProperty(values, "targetShadowOffset", std::move(targetShadowOffset));
  }

  setProperty(values, "currentShadowOpacity", jsi::Value(sourceViewProps.shadowOpacity));
  setProperty(values, "targetShadowOpacity", jsi::Value(targetViewProps.shadowOpacity));

  setProperty(values, "currentShadowRadius", jsi::Value(sourceViewProps.shadowRadius));
  setProperty(values, "targetShadowRadius", jsi::Value(targetViewProps.shadowRadius));

#ifdef ANDROID
  setProperty(values, "currentElevation", jsi::Value(sourceViewProps.elevation));
  setProperty(values, "targetElevation", jsi::Value(targetViewProps.elevation));
#endif
}

std::vector<BoxShadowWithDefault> SharedTransitionValuesFactory::getBoxShadowsFromProps(const ViewProps &props) {
  const auto &boxShadows = props.boxShadow;
  std::vector<BoxShadowWithDefault> boxShadowsWithDefault;
  for (const auto &boxShadow : boxShadows) {
    jsi::Object currentBoxShadow(rt_), defaultBoxShadow(rt_);

    currentBoxShadow.setProperty(rt_, "offsetX", boxShadow.offsetX);
    currentBoxShadow.setProperty(rt_, "offsetY", boxShadow.offsetY);
    currentBoxShadow.setProperty(rt_, "blurRadius", boxShadow.blurRadius);
    currentBoxShadow.setProperty(rt_, "spreadDistance", boxShadow.spreadDistance);
    currentBoxShadow.setProperty(rt_, "color", toString(boxShadow.color));

    defaultBoxShadow.setProperty(rt_, "offsetX", 0);
    defaultBoxShadow.setProperty(rt_, "offsetY", 0);
    defaultBoxShadow.setProperty(rt_, "blurRadius", 0);
    defaultBoxShadow.setProperty(rt_, "spreadDistance", 0);
    defaultBoxShadow.setProperty(rt_, "color", toString(SharedColor()));

    boxShadowsWithDefault.emplace_back(currentBoxShadow, defaultBoxShadow);
  }
  return boxShadowsWithDefault;
}

void SharedTransitionValuesFactory::diffBorder(
    jsi::Object &values,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  const auto &sourceBorderRadii = sourceViewProps.borderRadii;
  const auto &targetBorderRadii = targetViewProps.borderRadii;
  diffBorderRadius(
      values, sourceBorderRadii.all, targetBorderRadii.all, "currentBorderRadius", "targetBorderRadius", sourceViewProps, targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.topLeft,
      targetBorderRadii.topLeft,
      "currentBorderTopLeftRadius",
      "targetBorderTopLeftRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.topRight,
      targetBorderRadii.topRight,
      "currentBorderTopRightRadius",
      "targetBorderTopRightRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.bottomLeft,
      targetBorderRadii.bottomLeft,
      "currentBorderBottomLeftRadius",
      "targetBorderBottomLeftRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.bottomRight,
      targetBorderRadii.bottomRight,
      "currentBorderBottomRightRadius",
      "targetBorderBottomRightRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.topStart,
      targetBorderRadii.topStart,
      "currentBorderTopStartRadius",
      "targetBorderTopStartRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.topEnd,
      targetBorderRadii.topEnd,
      "currentBorderTopEndRadius",
      "targetBorderTopEndRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.bottomStart,
      targetBorderRadii.bottomStart,
      "currentBorderBottomStartRadius",
      "targetBorderBottomStartRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.bottomEnd,
      targetBorderRadii.bottomEnd,
      "currentBorderBottomEndRadius",
      "targetBorderBottomEndRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.endEnd,
      targetBorderRadii.endEnd,
      "currentBorderEndEndRadius",
      "targetBorderEndEndRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.endStart,
      targetBorderRadii.endStart,
      "currentBorderEndStartRadius",
      "targetBorderEndStartRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.startEnd,
      targetBorderRadii.startEnd,
      "currentBorderStartEndRadius",
      "targetBorderStartEndRadius",
      sourceViewProps,
      targetViewProps);
  diffBorderRadius(
      values,
      sourceBorderRadii.startStart,
      targetBorderRadii.startStart,
      "currentBorderStartStartRadius",
      "targetBorderStartStartRadius",
      sourceViewProps,
      targetViewProps);

  const auto &sourceBorderWidths = sourceViewProps.getBorderWidths();
  const auto &targetBorderWidths = targetViewProps.getBorderWidths();
  const auto defaultSourceWidth = sourceBorderWidths.all.value_or(0);
  const auto defaultTargetWidth = targetBorderWidths.all.value_or(0);
  diffBorderWidth(
      values,
      sourceBorderWidths.all,
      targetBorderWidths.all,
      "currentBorderWidth",
      "targetBorderWidth",
      defaultSourceWidth,
      defaultTargetWidth);
  diffBorderWidth(
      values,
      sourceBorderWidths.left,
      targetBorderWidths.left,
      "currentBorderLeftWidth",
      "targetBorderLeftWidth",
      defaultSourceWidth,
      defaultTargetWidth);
  diffBorderWidth(
      values,
      sourceBorderWidths.right,
      targetBorderWidths.right,
      "currentBorderRightWidth",
      "targetBorderRightWidth",
      defaultSourceWidth,
      defaultTargetWidth);
  diffBorderWidth(
      values,
      sourceBorderWidths.top,
      targetBorderWidths.top,
      "currentBorderTopWidth",
      "targetBorderTopWidth",
      defaultSourceWidth,
      defaultTargetWidth);
  diffBorderWidth(
      values,
      sourceBorderWidths.bottom,
      targetBorderWidths.bottom,
      "currentBorderBottomWidth",
      "targetBorderBottomWidth",
      defaultSourceWidth,
      defaultTargetWidth);

  const auto &sourceBorderColors = sourceViewProps.borderColors;
  const auto &targetBorderColors = targetViewProps.borderColors;
  diffBorderColors(
      values,
      sourceBorderColors.all,
      targetBorderColors.all,
      "currentBorderColor",
      "targetBorderColor",
      sourceViewProps,
      targetViewProps);
  diffBorderColors(
      values,
      sourceBorderColors.left,
      targetBorderColors.left,
      "currentBorderLeftColor",
      "targetBorderLeftColor",
      sourceViewProps,
      targetViewProps);
  diffBorderColors(
      values,
      sourceBorderColors.right,
      targetBorderColors.right,
      "currentBorderRightColor",
      "targetBorderRightColor",
      sourceViewProps,
      targetViewProps);
  diffBorderColors(
      values,
      sourceBorderColors.top,
      targetBorderColors.top,
      "currentBorderTopColor",
      "targetBorderTopColor",
      sourceViewProps,
      targetViewProps);
  diffBorderColors(
      values,
      sourceBorderColors.bottom,
      targetBorderColors.bottom,
      "currentBorderBottomColor",
      "targetBorderBottomColor",
      sourceViewProps,
      targetViewProps);
}

void SharedTransitionValuesFactory::diffBorderRadius(
    jsi::Object &values,
    const std::optional<react::ValueUnit> &sourceValue,
    const std::optional<react::ValueUnit> &targetValue,
    const char *sourceName,
    const char *targetName,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  ValueUnit defaultValue;
  const auto &source = sourceValue.value_or(defaultValue).value;
  const auto &target = targetValue.value_or(defaultValue).value;
  // In React Native, we can't set asymmetric border radii for the edges of a
  // corner using pixels. This limitation means we can't properly animate
  // between units in percentages and pixels.
  if (targetValue.value_or(defaultValue).unit == UnitType::Percent) {
    if (sourceValue.has_value()) {
      setProperty(values, sourceName, jsi::String::createFromUtf8(rt_, std::to_string(source) + "%"));
    } else {
      const auto &defaultRadius = sourceViewProps.borderRadii.all.value_or(defaultValue).value;
      setProperty(values, sourceName, jsi::String::createFromUtf8(rt_, std::to_string(defaultRadius) + "%"));
    }
    if (targetValue.has_value()) {
      setProperty(values, targetName, jsi::String::createFromUtf8(rt_, std::to_string(target) + "%"));
    } else {
      const auto &defaultRadius = targetViewProps.borderRadii.all.value_or(defaultValue).value;
      setProperty(values, targetName, jsi::String::createFromUtf8(rt_, std::to_string(defaultRadius) + "%"));
    }
  } else {
    if (sourceValue.has_value()) {
      setProperty(values, sourceName, jsi::Value(source));
    } else {
      const auto &defaultRadius = sourceViewProps.borderRadii.all.value_or(defaultValue).value;
      setProperty(values, sourceName, jsi::Value(defaultRadius));
    }
    if (targetValue.has_value()) {
      setProperty(values, targetName, jsi::Value(target));
    } else {
      const auto &defaultRadius = targetViewProps.borderRadii.all.value_or(defaultValue).value;
      setProperty(values, targetName, jsi::Value(defaultRadius));
    }
  }
}

void SharedTransitionValuesFactory::diffBorderWidth(
    jsi::Object &values,
    const std::optional<react::Float> &sourceValue,
    const std::optional<react::Float> &targetValue,
    const char *sourceName,
    const char *targetName,
    float defaultSourceWidth,
    float defaultTargetWidth) {
  if (sourceValue.has_value()) {
    setProperty(values, sourceName, jsi::Value(sourceValue.value()));
  } else {
    setProperty(values, sourceName, jsi::Value(defaultSourceWidth));
  }

  if (targetValue.has_value()) {
    setProperty(values, targetName, jsi::Value(targetValue.value()));
  } else {
    setProperty(values, targetName, jsi::Value(defaultTargetWidth));
  }
}

void SharedTransitionValuesFactory::diffBorderColors(
    jsi::Object &values,
    const std::optional<react::SharedColor> &sourceValue,
    const std::optional<react::SharedColor> &targetValue,
    const char *sourceName,
    const char *targetName,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  SharedColor defaultValue;
  if (sourceValue.has_value()) {
    setProperty(values, sourceName, jsi::String::createFromUtf8(rt_, toString(sourceValue.value())));
  } else {
    auto const &maybeDefaultColor = sourceViewProps.borderColors.all.value_or(defaultValue);
    setProperty(values, sourceName, jsi::String::createFromUtf8(rt_, toString(maybeDefaultColor)));
  }

  if (targetValue.has_value()) {
    setProperty(values, targetName, jsi::String::createFromUtf8(rt_, toString(targetValue.value())));
  } else {
    auto const &maybeDefaultColor = targetViewProps.borderColors.all.value_or(defaultValue);
    setProperty(values, targetName, jsi::String::createFromUtf8(rt_, toString(maybeDefaultColor)));
  }
}

// Copied from
// https://github.com/facebook/react-native/blob/v0.80.0-rc.5/packages/react-native/ReactCommon/react/renderer/core/graphicsConversions.h#L47
// I needed to manually apply a patch for unnecessary alpha channel
// normalization.
inline std::string SharedTransitionValuesFactory::toString(const SharedColor &value) {
  ColorComponents components = colorComponentsFromColor(value);
  std::array<char, 255> buffer{};
  std::snprintf(
      buffer.data(),
      buffer.size(),
      "rgba(%.0f, %.0f, %.0f, %f)",
      components.red * 255.f,
      components.green * 255.f,
      components.blue * 255.f,
      components.alpha);
  return buffer.data();
}

} // namespace reanimated
