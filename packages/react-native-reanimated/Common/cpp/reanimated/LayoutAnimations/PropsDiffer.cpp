#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/graphicsConversions.h>
#include <react/renderer/graphics/Transform.h>
#include <reanimated/LayoutAnimations/PropsDiffer.h>

#include <cctype>
#include <string>
#include <vector>

using namespace facebook;

namespace reanimated {

std::string PropsDiffer::sourceKey(const char *name) {
  std::string result = "current";
  result += static_cast<char>(std::toupper(static_cast<unsigned char>(name[0])));
  result += name + 1;
  return result;
}

std::string PropsDiffer::targetKey(const char *name) {
  std::string result = "target";
  result += static_cast<char>(std::toupper(static_cast<unsigned char>(name[0])));
  result += name + 1;
  return result;
}

void PropsDiffer::setSource(jsi::Runtime &rt, const char *name, jsi::Value &&value) {
  values_.setProperty(rt, sourceKey(name).c_str(), value);
}

void PropsDiffer::setTarget(jsi::Runtime &rt, const char *name, jsi::Value &&value) {
  values_.setProperty(rt, targetKey(name).c_str(), value);
}

jsi::Object PropsDiffer::computeDiff(jsi::Runtime &runtime) {
  diffFrame(runtime);
  diffOpacity(runtime);
  diffBackgroundColor(runtime);
  diffTransform(runtime);
  diffTransformOrigin(runtime);
  diffShadow(runtime);
  diffBorder(runtime);

  return std::move(values_);
}

void PropsDiffer::diffFrame(jsi::Runtime &rt) {
  const auto &sourceFrame = sourceView_.layoutMetrics.frame;
  const auto &targetFrame = targetView_.layoutMetrics.frame;
  const auto &sourceOrigin = sourceFrame.origin;
  const auto &targetOrigin = targetFrame.origin;

  setSource(rt, "originX", jsi::Value(sourceOrigin.x));
  setTarget(rt, "originX", jsi::Value(targetOrigin.x));
  setSource(rt, "globalOriginX", jsi::Value(sourceOrigin.x));
  setTarget(rt, "globalOriginX", jsi::Value(targetOrigin.x));

  setSource(rt, "originY", jsi::Value(sourceOrigin.y));
  setTarget(rt, "originY", jsi::Value(targetOrigin.y));
  setSource(rt, "globalOriginY", jsi::Value(sourceOrigin.y));
  setTarget(rt, "globalOriginY", jsi::Value(targetOrigin.y));

  const auto &sourceSize = sourceFrame.size;
  const auto &targetSize = targetFrame.size;

  setSource(rt, "width", jsi::Value(sourceSize.width));
  setTarget(rt, "width", jsi::Value(targetSize.width));

  setSource(rt, "height", jsi::Value(sourceSize.height));
  setTarget(rt, "height", jsi::Value(targetSize.height));
}

void PropsDiffer::diffOpacity(jsi::Runtime &rt) {
  setSource(rt, "opacity", jsi::Value(sourceViewProps_.opacity));
  setTarget(rt, "opacity", jsi::Value(targetViewProps_.opacity));
}

void PropsDiffer::diffBackgroundColor(jsi::Runtime &rt) {
  setSource(rt, "backgroundColor", jsi::String::createFromUtf8(rt, react::toString(sourceViewProps_.backgroundColor)));
  setTarget(rt, "backgroundColor", jsi::String::createFromUtf8(rt, react::toString(targetViewProps_.backgroundColor)));
}

void PropsDiffer::diffTransform(jsi::Runtime &rt) {
  const auto &sourceJsiOperations =
      getTransformOperationsFromProps(rt, sourceViewProps_, sourceView_.layoutMetrics.frame.size);
  const auto &targetJsiOperations =
      getTransformOperationsFromProps(rt, targetViewProps_, targetView_.layoutMetrics.frame.size);

  if (sourceJsiOperations.size() == 1 && targetJsiOperations.size() == 1 &&
      sourceJsiOperations[0].currentValue.hasProperty(rt, "matrix") &&
      targetJsiOperations[0].currentValue.hasProperty(rt, "matrix")) {
    jsi::Array sourceTransforms(rt, 1), targetTransforms(rt, 1);
    sourceTransforms.setValueAtIndex(rt, 0, sourceJsiOperations[0].currentValue);
    targetTransforms.setValueAtIndex(rt, 0, targetJsiOperations[0].currentValue);
    setSource(rt, "transform", std::move(sourceTransforms));
    setTarget(rt, "transform", std::move(targetTransforms));
    return;
  }

  jsi::Array sourceTransforms(rt, sourceJsiOperations.size() + targetJsiOperations.size());
  jsi::Array targetTransforms(rt, sourceJsiOperations.size() + targetJsiOperations.size());
  for (size_t i = 0; i < sourceJsiOperations.size(); i++) {
    sourceTransforms.setValueAtIndex(rt, i, sourceJsiOperations[i].currentValue);
    targetTransforms.setValueAtIndex(rt, i, sourceJsiOperations[i].defaultValue);
  }
  for (size_t i = 0; i < targetJsiOperations.size(); i++) {
    size_t index = i + sourceJsiOperations.size();
    sourceTransforms.setValueAtIndex(rt, index, targetJsiOperations[i].defaultValue);
    targetTransforms.setValueAtIndex(rt, index, targetJsiOperations[i].currentValue);
  }
  setSource(rt, "transform", std::move(sourceTransforms));
  setTarget(rt, "transform", std::move(targetTransforms));
}

std::vector<TransformOperationWithDefault>
PropsDiffer::getTransformOperationsFromProps(jsi::Runtime &rt, const ViewProps &props, const react::Size &viewSize) {
  std::vector<TransformOperationWithDefault> jsiOperations;
  const auto &operations = props.transform.operations;

  if (operations.size() == 1 && operations[0].type == react::TransformOperationType::Arbitrary) {
    jsi::Array currentMatrix(rt, 16), defaultMatrix(rt, 16);
    for (int i = 0; i < 16; i++) {
      currentMatrix.setValueAtIndex(rt, i, props.transform.matrix[i]);
      defaultMatrix.setValueAtIndex(rt, i, i % 5 == 0 ? 1 : 0);
    }

    jsi::Object currentValue(rt), defaultValue(rt);
    currentValue.setProperty(rt, "matrix", currentMatrix);
    defaultValue.setProperty(rt, "matrix", defaultMatrix);
    jsiOperations.emplace_back(currentValue, defaultValue);
  }

  for (const auto &operation : operations) {
    switch (operation.type) {
      case react::TransformOperationType::Perspective: {
        maybeAddOperationToDiff(rt, "perspective", operation.x.value, 1, jsiOperations);
      } break;

      case react::TransformOperationType::Scale: {
        maybeAddOperationToDiff(rt, "scaleX", operation.x.value, 1, jsiOperations);
        maybeAddOperationToDiff(rt, "scaleY", operation.y.value, 1, jsiOperations);
        maybeAddOperationToDiff(rt, "scaleZ", operation.z.value, 1, jsiOperations);
      } break;

      case react::TransformOperationType::Translate: {
        maybeAddOperationToDiff(rt, "translateX", operation.x.resolve(viewSize.width), 0, jsiOperations);
        maybeAddOperationToDiff(rt, "translateY", operation.y.resolve(viewSize.height), 0, jsiOperations);
        maybeAddOperationToDiff(rt, "translateZ", operation.z.value, 0, jsiOperations);
      } break;

      case react::TransformOperationType::Rotate: {
        maybeAddOperationToDiff(rt, "rotateX", operation.x.value, 0, jsiOperations);
        maybeAddOperationToDiff(rt, "rotateY", operation.y.value, 0, jsiOperations);
        maybeAddOperationToDiff(rt, "rotateZ", operation.z.value, 0, jsiOperations);
      } break;

      case react::TransformOperationType::Skew: {
        maybeAddOperationToDiff(rt, "skewX", operation.x.value, 0, jsiOperations);
        maybeAddOperationToDiff(rt, "skewY", operation.y.value, 0, jsiOperations);
        maybeAddOperationToDiff(rt, "skewZ", operation.z.value, 0, jsiOperations);
      } break;

      default: {
      }
    }
  }
  return jsiOperations;
}

void PropsDiffer::maybeAddOperationToDiff(
    jsi::Runtime &rt,
    const char *name,
    float value,
    float defaultValue,
    std::vector<TransformOperationWithDefault> &jsiOperations) {
  if (value == defaultValue) {
    return;
  }
  jsi::Object jsiValue(rt);
  jsiValue.setProperty(rt, name, value);
  jsi::Object jsiDefaultDefault(rt);
  jsiDefaultDefault.setProperty(rt, name, defaultValue);
  jsiOperations.emplace_back(jsiValue, jsiDefaultDefault);
}

void PropsDiffer::diffTransformOrigin(jsi::Runtime &rt) {
  const auto &sourceTransformOrigin = sourceViewProps_.transformOrigin;
  const auto &targetTransformOrigin = targetViewProps_.transformOrigin;

  addTransformOriginToDiff(rt, sourceTransformOrigin, sourceView_, /*isTarget=*/false);
  addTransformOriginToDiff(rt, targetTransformOrigin, targetView_, /*isTarget=*/true);
}

void PropsDiffer::addTransformOriginToDiff(
    jsi::Runtime &rt,
    const TransformOrigin &transformOrigin,
    const ShadowView &view,
    bool isTarget) {
  jsi::Array transformOriginJsi(rt, 3);

  const auto &viewSize = view.layoutMetrics.frame.size;

  if (transformOrigin.xy[0].unit == UnitType::Percent) {
    transformOriginJsi.setValueAtIndex(rt, 0, viewSize.width * transformOrigin.xy[0].value / 100);
  } else if (transformOrigin.xy[0].unit == UnitType::Undefined) {
    // Unset transformOrigin defaults to "50% 50%" (view center), per CSS.
    transformOriginJsi.setValueAtIndex(rt, 0, viewSize.width * 0.5);
  } else {
    transformOriginJsi.setValueAtIndex(rt, 0, transformOrigin.xy[0].value);
  }

  if (transformOrigin.xy[1].unit == UnitType::Percent) {
    transformOriginJsi.setValueAtIndex(rt, 1, viewSize.height * transformOrigin.xy[1].value / 100);
  } else if (transformOrigin.xy[1].unit == UnitType::Undefined) {
    transformOriginJsi.setValueAtIndex(rt, 1, viewSize.height * 0.5);
  } else {
    transformOriginJsi.setValueAtIndex(rt, 1, transformOrigin.xy[1].value);
  }

  transformOriginJsi.setValueAtIndex(rt, 2, transformOrigin.z);

  if (isTarget) {
    setTarget(rt, "transformOrigin", std::move(transformOriginJsi));
  } else {
    setSource(rt, "transformOrigin", std::move(transformOriginJsi));
  }
}

void PropsDiffer::diffShadow(jsi::Runtime &rt) {
  const auto &sourceBoxShadows = getBoxShadowsFromProps(rt, sourceViewProps_);
  const auto &targetBoxShadows = getBoxShadowsFromProps(rt, targetViewProps_);

  if (sourceBoxShadows.size() == targetBoxShadows.size()) {
    const size_t size = sourceBoxShadows.size();
    jsi::Array sourceBoxShadowArray(rt, size), targetBoxShadowArray(rt, size);
    for (int i = 0; i < size; i++) {
      sourceBoxShadowArray.setValueAtIndex(rt, i, sourceBoxShadows[i].currentValue);
      targetBoxShadowArray.setValueAtIndex(rt, i, targetBoxShadows[i].currentValue);
    }
    setSource(rt, "boxShadow", std::move(sourceBoxShadowArray));
    setTarget(rt, "boxShadow", std::move(targetBoxShadowArray));
  } else {
    const size_t size = sourceBoxShadows.size() + targetBoxShadows.size();
    jsi::Array sourceBoxShadowArray(rt, size), targetBoxShadowArray(rt, size);
    for (size_t i = 0; i < sourceBoxShadows.size(); i++) {
      sourceBoxShadowArray.setValueAtIndex(rt, i, sourceBoxShadows[i].currentValue);
      targetBoxShadowArray.setValueAtIndex(rt, i, sourceBoxShadows[i].defaultValue);
    }
    for (size_t i = 0; i < targetBoxShadows.size(); i++) {
      size_t index = i + sourceBoxShadows.size();
      sourceBoxShadowArray.setValueAtIndex(rt, index, targetBoxShadows[i].defaultValue);
      targetBoxShadowArray.setValueAtIndex(rt, index, targetBoxShadows[i].currentValue);
    }
    setSource(rt, "boxShadow", std::move(sourceBoxShadowArray));
    setTarget(rt, "boxShadow", std::move(targetBoxShadowArray));
  }

  setSource(rt, "shadowColor", jsi::String::createFromUtf8(rt, toString(sourceViewProps_.shadowColor)));
  setTarget(rt, "shadowColor", jsi::String::createFromUtf8(rt, toString(targetViewProps_.shadowColor)));

  {
    jsi::Object sourceShadowOffset(rt), targetShadowOffset(rt);
    sourceShadowOffset.setProperty(rt, "width", sourceViewProps_.shadowOffset.width);
    sourceShadowOffset.setProperty(rt, "height", sourceViewProps_.shadowOffset.height);
    targetShadowOffset.setProperty(rt, "width", targetViewProps_.shadowOffset.width);
    targetShadowOffset.setProperty(rt, "height", targetViewProps_.shadowOffset.height);
    setSource(rt, "shadowOffset", std::move(sourceShadowOffset));
    setTarget(rt, "shadowOffset", std::move(targetShadowOffset));
  }

  setSource(rt, "shadowOpacity", jsi::Value(sourceViewProps_.shadowOpacity));
  setTarget(rt, "shadowOpacity", jsi::Value(targetViewProps_.shadowOpacity));

  setSource(rt, "shadowRadius", jsi::Value(sourceViewProps_.shadowRadius));
  setTarget(rt, "shadowRadius", jsi::Value(targetViewProps_.shadowRadius));

#ifdef ANDROID
  setSource(rt, "elevation", jsi::Value(sourceViewProps_.elevation));
  setTarget(rt, "elevation", jsi::Value(targetViewProps_.elevation));
#endif
}

std::vector<BoxShadowWithDefault> PropsDiffer::getBoxShadowsFromProps(jsi::Runtime &rt, const ViewProps &props) {
  const auto &boxShadows = props.boxShadow;
  std::vector<BoxShadowWithDefault> boxShadowsWithDefault;
  for (const auto &boxShadow : boxShadows) {
    jsi::Object currentBoxShadow(rt), defaultBoxShadow(rt);

    currentBoxShadow.setProperty(rt, "offsetX", boxShadow.offsetX);
    currentBoxShadow.setProperty(rt, "offsetY", boxShadow.offsetY);
    currentBoxShadow.setProperty(rt, "blurRadius", boxShadow.blurRadius);
    currentBoxShadow.setProperty(rt, "spreadDistance", boxShadow.spreadDistance);
    currentBoxShadow.setProperty(rt, "color", toString(boxShadow.color));

    defaultBoxShadow.setProperty(rt, "offsetX", 0);
    defaultBoxShadow.setProperty(rt, "offsetY", 0);
    defaultBoxShadow.setProperty(rt, "blurRadius", 0);
    defaultBoxShadow.setProperty(rt, "spreadDistance", 0);
    defaultBoxShadow.setProperty(rt, "color", toString(SharedColor()));

    boxShadowsWithDefault.emplace_back(currentBoxShadow, defaultBoxShadow);
  }
  return boxShadowsWithDefault;
}

void PropsDiffer::diffBorder(jsi::Runtime &rt) {
  const auto &sourceBorderRadii = sourceViewProps_.borderRadii;
  const auto &targetBorderRadii = targetViewProps_.borderRadii;
  diffBorderRadius(sourceBorderRadii.all, targetBorderRadii.all, "borderRadius", rt);
  diffBorderRadius(sourceBorderRadii.topLeft, targetBorderRadii.topLeft, "borderTopLeftRadius", rt);
  diffBorderRadius(sourceBorderRadii.topRight, targetBorderRadii.topRight, "borderTopRightRadius", rt);
  diffBorderRadius(sourceBorderRadii.bottomLeft, targetBorderRadii.bottomLeft, "borderBottomLeftRadius", rt);
  diffBorderRadius(sourceBorderRadii.bottomRight, targetBorderRadii.bottomRight, "borderBottomRightRadius", rt);
  diffBorderRadius(sourceBorderRadii.topStart, targetBorderRadii.topStart, "borderTopStartRadius", rt);
  diffBorderRadius(sourceBorderRadii.topEnd, targetBorderRadii.topEnd, "borderTopEndRadius", rt);
  diffBorderRadius(sourceBorderRadii.bottomStart, targetBorderRadii.bottomStart, "borderBottomStartRadius", rt);
  diffBorderRadius(sourceBorderRadii.bottomEnd, targetBorderRadii.bottomEnd, "borderBottomEndRadius", rt);
  diffBorderRadius(sourceBorderRadii.endEnd, targetBorderRadii.endEnd, "borderEndEndRadius", rt);
  diffBorderRadius(sourceBorderRadii.endStart, targetBorderRadii.endStart, "borderEndStartRadius", rt);
  diffBorderRadius(sourceBorderRadii.startEnd, targetBorderRadii.startEnd, "borderStartEndRadius", rt);
  diffBorderRadius(sourceBorderRadii.startStart, targetBorderRadii.startStart, "borderStartStartRadius", rt);

  const auto &sourceBorderWidths = sourceViewProps_.getBorderWidths();
  const auto &targetBorderWidths = targetViewProps_.getBorderWidths();
  const auto defaultSourceWidth = sourceBorderWidths.all.value_or(0);
  const auto defaultTargetWidth = targetBorderWidths.all.value_or(0);
  diffBorderWidth(
      sourceBorderWidths.all, targetBorderWidths.all, "borderWidth", rt, defaultSourceWidth, defaultTargetWidth);
  diffBorderWidth(
      sourceBorderWidths.left, targetBorderWidths.left, "borderLeftWidth", rt, defaultSourceWidth, defaultTargetWidth);
  diffBorderWidth(
      sourceBorderWidths.right,
      targetBorderWidths.right,
      "borderRightWidth",
      rt,
      defaultSourceWidth,
      defaultTargetWidth);
  diffBorderWidth(
      sourceBorderWidths.top, targetBorderWidths.top, "borderTopWidth", rt, defaultSourceWidth, defaultTargetWidth);
  diffBorderWidth(
      sourceBorderWidths.bottom,
      targetBorderWidths.bottom,
      "borderBottomWidth",
      rt,
      defaultSourceWidth,
      defaultTargetWidth);

  const auto &sourceBorderColors = sourceViewProps_.borderColors;
  const auto &targetBorderColors = targetViewProps_.borderColors;
  diffBorderColors(sourceBorderColors.all, targetBorderColors.all, "borderColor", rt);
  diffBorderColors(sourceBorderColors.left, targetBorderColors.left, "borderLeftColor", rt);
  diffBorderColors(sourceBorderColors.right, targetBorderColors.right, "borderRightColor", rt);
  diffBorderColors(sourceBorderColors.top, targetBorderColors.top, "borderTopColor", rt);
  diffBorderColors(sourceBorderColors.bottom, targetBorderColors.bottom, "borderBottomColor", rt);
}

void PropsDiffer::diffBorderRadius(
    const std::optional<react::ValueUnit> &sourceValue,
    const std::optional<react::ValueUnit> &targetValue,
    const char *name,
    jsi::Runtime &rt) {
  ValueUnit defaultValue;
  const auto &source = sourceValue.value_or(defaultValue).value;
  const auto &target = targetValue.value_or(defaultValue).value;
  // In React Native, we can't set asymmetric border radii for the edges of a
  // corner using pixels. This limitation means we can't properly animate
  // between units in percentages and pixels.
  if (targetValue.value_or(defaultValue).unit == UnitType::Percent) {
    if (sourceValue.has_value()) {
      setSource(rt, name, jsi::String::createFromUtf8(rt, std::to_string(source) + "%"));
    } else {
      const auto &defaultRadius = sourceViewProps_.borderRadii.all.value_or(defaultValue).value;
      setSource(rt, name, jsi::String::createFromUtf8(rt, std::to_string(defaultRadius) + "%"));
    }
    if (targetValue.has_value()) {
      setTarget(rt, name, jsi::String::createFromUtf8(rt, std::to_string(target) + "%"));
    } else {
      const auto &defaultRadius = targetViewProps_.borderRadii.all.value_or(defaultValue).value;
      setTarget(rt, name, jsi::String::createFromUtf8(rt, std::to_string(defaultRadius) + "%"));
    }
  } else {
    if (sourceValue.has_value()) {
      setSource(rt, name, jsi::Value(source));
    } else {
      const auto &defaultRadius = sourceViewProps_.borderRadii.all.value_or(defaultValue).value;
      setSource(rt, name, jsi::Value(defaultRadius));
    }
    if (targetValue.has_value()) {
      setTarget(rt, name, jsi::Value(target));
    } else {
      const auto &defaultRadius = targetViewProps_.borderRadii.all.value_or(defaultValue).value;
      setTarget(rt, name, jsi::Value(defaultRadius));
    }
  }
}

void PropsDiffer::diffBorderWidth(
    const std::optional<react::Float> &sourceValue,
    const std::optional<react::Float> &targetValue,
    const char *name,
    jsi::Runtime &rt,
    float defaultSourceWidth,
    float defaultTargetWidth) {
  if (sourceValue.has_value()) {
    setSource(rt, name, jsi::Value(sourceValue.value()));
  } else {
    setSource(rt, name, jsi::Value(defaultSourceWidth));
  }

  if (targetValue.has_value()) {
    setTarget(rt, name, jsi::Value(targetValue.value()));
  } else {
    setTarget(rt, name, jsi::Value(defaultTargetWidth));
  }
}

void PropsDiffer::diffBorderColors(
    const std::optional<react::SharedColor> &sourceValue,
    const std::optional<react::SharedColor> &targetValue,
    const char *name,
    jsi::Runtime &rt) {
  SharedColor defaultValue;
  if (sourceValue.has_value()) {
    setSource(rt, name, jsi::String::createFromUtf8(rt, toString(sourceValue.value())));
  } else {
    auto const &maybeDefaultColor = sourceViewProps_.borderColors.all.value_or(defaultValue);
    setSource(rt, name, jsi::String::createFromUtf8(rt, toString(maybeDefaultColor)));
  }

  if (targetValue.has_value()) {
    setTarget(rt, name, jsi::String::createFromUtf8(rt, toString(targetValue.value())));
  } else {
    auto const &maybeDefaultColor = targetViewProps_.borderColors.all.value_or(defaultValue);
    setTarget(rt, name, jsi::String::createFromUtf8(rt, toString(maybeDefaultColor)));
  }
}

// Copied from
// https://github.com/facebook/react-native/blob/v0.80.0-rc.5/packages/react-native/ReactCommon/react/renderer/core/graphicsConversions.h#L47
// I needed to manually apply a patch for unnecessary alpha channel
// normalization.
inline std::string PropsDiffer::toString(const SharedColor &value) {
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
