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

  writeFrame(values, sourceView, targetView);
  writeOpacity(values, sourceViewProps, targetViewProps);
  writeBackgroundColor(values, sourceViewProps, targetViewProps);
  writeTransform(values, sourceViewProps, targetViewProps);
  writeTransformOrigin(values, sourceView, targetView, sourceViewProps, targetViewProps);
  writeShadow(values, sourceViewProps, targetViewProps);
  writeBorder(values, sourceViewProps, targetViewProps);

  return values;
}

void SharedTransitionValuesFactory::writeFrame(
    jsi::Object &values,
    const ShadowView &sourceView,
    const ShadowView &targetView) {
  const auto &sourceFrame = sourceView.layoutMetrics.frame;
  const auto &targetFrame = targetView.layoutMetrics.frame;
  const auto &sourceOrigin = sourceFrame.origin;
  const auto &targetOrigin = targetFrame.origin;

  setProperty(values, "currentOriginX", jsi::Value(sourceOrigin.x));
  setProperty(values, "targetOriginX", jsi::Value(targetOrigin.x));
  setProperty(values, "currentOriginY", jsi::Value(sourceOrigin.y));
  setProperty(values, "targetOriginY", jsi::Value(targetOrigin.y));

  // globalOriginX/Y is intentionally zero. It exists on the worklet values
  // object for backward-compat with v3's type, but its value was always 0 on
  // Android (the v3 SET snapshot constructor never assigned it) and only
  // happened to mirror originX on iOS. v4 normalises both platforms to 0 to
  // discourage use. Reach for originX/Y instead.
  setProperty(values, "currentGlobalOriginX", jsi::Value(0));
  setProperty(values, "targetGlobalOriginX", jsi::Value(0));
  setProperty(values, "currentGlobalOriginY", jsi::Value(0));
  setProperty(values, "targetGlobalOriginY", jsi::Value(0));

  const auto &sourceSize = sourceFrame.size;
  const auto &targetSize = targetFrame.size;

  setProperty(values, "currentWidth", jsi::Value(sourceSize.width));
  setProperty(values, "targetWidth", jsi::Value(targetSize.width));

  setProperty(values, "currentHeight", jsi::Value(sourceSize.height));
  setProperty(values, "targetHeight", jsi::Value(targetSize.height));
}

void SharedTransitionValuesFactory::writeOpacity(
    jsi::Object &values,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  setProperty(values, "currentOpacity", jsi::Value(sourceViewProps.opacity));
  setProperty(values, "targetOpacity", jsi::Value(targetViewProps.opacity));
}

void SharedTransitionValuesFactory::writeBackgroundColor(
    jsi::Object &values,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  setProperty(
      values, "currentBackgroundColor", jsi::String::createFromUtf8(rt_, react::toString(sourceViewProps.backgroundColor)));
  setProperty(
      values, "targetBackgroundColor", jsi::String::createFromUtf8(rt_, react::toString(targetViewProps.backgroundColor)));
}

void SharedTransitionValuesFactory::writeTransform(
    jsi::Object &values,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  setProperty(values, "currentTransform", buildTransformObject(sourceViewProps));
  setProperty(values, "targetTransform", buildTransformObject(targetViewProps));

  // Deprecated v3-style flat matrix arrays. Kept for backward compatibility
  setProperty(values, "currentTransformMatrix", buildMatrixArray(sourceViewProps));
  setProperty(values, "targetTransformMatrix", buildMatrixArray(targetViewProps));
}

jsi::Array SharedTransitionValuesFactory::buildMatrixArray(const ViewProps &props) {
  jsi::Array matrixArray(rt_, 16);
  for (int i = 0; i < 16; i++) {
    matrixArray.setValueAtIndex(rt_, i, props.transform.matrix[i]);
  }
  return matrixArray;
}

jsi::Object SharedTransitionValuesFactory::buildTransformObject(const ViewProps &props) {
  jsi::Object entry(rt_);
  entry.setProperty(rt_, "matrix", buildMatrixArray(props));
  return entry;
}

void SharedTransitionValuesFactory::writeTransformOrigin(
    jsi::Object &values,
    const ShadowView &sourceView,
    const ShadowView &targetView,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  auto buildOrigin = [&](const TransformOrigin &transformOrigin, const ShadowView &view) {
    jsi::Array originJsi(rt_, 3);
    const auto &viewSize = view.layoutMetrics.frame.size;

    if (transformOrigin.xy[0].unit == UnitType::Percent) {
      originJsi.setValueAtIndex(rt_, 0, viewSize.width * transformOrigin.xy[0].value / 100);
    } else if (transformOrigin.xy[0].unit == UnitType::Undefined) {
      // Unset transformOrigin defaults to "50% 50%" (view center), per CSS.
      originJsi.setValueAtIndex(rt_, 0, viewSize.width * 0.5);
    } else {
      originJsi.setValueAtIndex(rt_, 0, transformOrigin.xy[0].value);
    }

    if (transformOrigin.xy[1].unit == UnitType::Percent) {
      originJsi.setValueAtIndex(rt_, 1, viewSize.height * transformOrigin.xy[1].value / 100);
    } else if (transformOrigin.xy[1].unit == UnitType::Undefined) {
      originJsi.setValueAtIndex(rt_, 1, viewSize.height * 0.5);
    } else {
      originJsi.setValueAtIndex(rt_, 1, transformOrigin.xy[1].value);
    }

    originJsi.setValueAtIndex(rt_, 2, transformOrigin.z);
    return originJsi;
  };

  setProperty(values, "currentTransformOrigin", buildOrigin(sourceViewProps.transformOrigin, sourceView));
  setProperty(values, "targetTransformOrigin", buildOrigin(targetViewProps.transformOrigin, targetView));
}

void SharedTransitionValuesFactory::writeShadow(
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

void SharedTransitionValuesFactory::writeBorder(
    jsi::Object &values,
    const ViewProps &sourceViewProps,
    const ViewProps &targetViewProps) {
  const auto &sourceBorderRadii = sourceViewProps.borderRadii;
  const auto &targetBorderRadii = targetViewProps.borderRadii;
  writeBorderRadius(
      values, sourceBorderRadii.all, targetBorderRadii.all, "currentBorderRadius", "targetBorderRadius", sourceViewProps, targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.topLeft,
      targetBorderRadii.topLeft,
      "currentBorderTopLeftRadius",
      "targetBorderTopLeftRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.topRight,
      targetBorderRadii.topRight,
      "currentBorderTopRightRadius",
      "targetBorderTopRightRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.bottomLeft,
      targetBorderRadii.bottomLeft,
      "currentBorderBottomLeftRadius",
      "targetBorderBottomLeftRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.bottomRight,
      targetBorderRadii.bottomRight,
      "currentBorderBottomRightRadius",
      "targetBorderBottomRightRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.topStart,
      targetBorderRadii.topStart,
      "currentBorderTopStartRadius",
      "targetBorderTopStartRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.topEnd,
      targetBorderRadii.topEnd,
      "currentBorderTopEndRadius",
      "targetBorderTopEndRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.bottomStart,
      targetBorderRadii.bottomStart,
      "currentBorderBottomStartRadius",
      "targetBorderBottomStartRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.bottomEnd,
      targetBorderRadii.bottomEnd,
      "currentBorderBottomEndRadius",
      "targetBorderBottomEndRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.endEnd,
      targetBorderRadii.endEnd,
      "currentBorderEndEndRadius",
      "targetBorderEndEndRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.endStart,
      targetBorderRadii.endStart,
      "currentBorderEndStartRadius",
      "targetBorderEndStartRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
      values,
      sourceBorderRadii.startEnd,
      targetBorderRadii.startEnd,
      "currentBorderStartEndRadius",
      "targetBorderStartEndRadius",
      sourceViewProps,
      targetViewProps);
  writeBorderRadius(
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
  writeBorderWidth(
      values,
      sourceBorderWidths.all,
      targetBorderWidths.all,
      "currentBorderWidth",
      "targetBorderWidth",
      defaultSourceWidth,
      defaultTargetWidth);
  writeBorderWidth(
      values,
      sourceBorderWidths.left,
      targetBorderWidths.left,
      "currentBorderLeftWidth",
      "targetBorderLeftWidth",
      defaultSourceWidth,
      defaultTargetWidth);
  writeBorderWidth(
      values,
      sourceBorderWidths.right,
      targetBorderWidths.right,
      "currentBorderRightWidth",
      "targetBorderRightWidth",
      defaultSourceWidth,
      defaultTargetWidth);
  writeBorderWidth(
      values,
      sourceBorderWidths.top,
      targetBorderWidths.top,
      "currentBorderTopWidth",
      "targetBorderTopWidth",
      defaultSourceWidth,
      defaultTargetWidth);
  writeBorderWidth(
      values,
      sourceBorderWidths.bottom,
      targetBorderWidths.bottom,
      "currentBorderBottomWidth",
      "targetBorderBottomWidth",
      defaultSourceWidth,
      defaultTargetWidth);

  const auto &sourceBorderColors = sourceViewProps.borderColors;
  const auto &targetBorderColors = targetViewProps.borderColors;
  writeBorderColors(
      values,
      sourceBorderColors.all,
      targetBorderColors.all,
      "currentBorderColor",
      "targetBorderColor",
      sourceViewProps,
      targetViewProps);
  writeBorderColors(
      values,
      sourceBorderColors.left,
      targetBorderColors.left,
      "currentBorderLeftColor",
      "targetBorderLeftColor",
      sourceViewProps,
      targetViewProps);
  writeBorderColors(
      values,
      sourceBorderColors.right,
      targetBorderColors.right,
      "currentBorderRightColor",
      "targetBorderRightColor",
      sourceViewProps,
      targetViewProps);
  writeBorderColors(
      values,
      sourceBorderColors.top,
      targetBorderColors.top,
      "currentBorderTopColor",
      "targetBorderTopColor",
      sourceViewProps,
      targetViewProps);
  writeBorderColors(
      values,
      sourceBorderColors.bottom,
      targetBorderColors.bottom,
      "currentBorderBottomColor",
      "targetBorderBottomColor",
      sourceViewProps,
      targetViewProps);
}

void SharedTransitionValuesFactory::writeBorderRadius(
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

void SharedTransitionValuesFactory::writeBorderWidth(
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

void SharedTransitionValuesFactory::writeBorderColors(
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
