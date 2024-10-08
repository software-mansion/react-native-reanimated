#ifdef RCT_NEW_ARCH_ENABLED
#include "YogaPropertySettingUtils.h"
#include "SnapshotUtils.h"

namespace reanimated {
void setYogaCurrentSnapshotProperties(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot currentValues) {
  yogaValues->setProperty(runtime, "currentOriginX", currentValues.x);
  yogaValues->setProperty(runtime, "currentGlobalOriginX", currentValues.x);
  yogaValues->setProperty(runtime, "currentOriginY", currentValues.y);
  yogaValues->setProperty(runtime, "currentGlobalOriginY", currentValues.y);
  yogaValues->setProperty(runtime, "currentWidth", currentValues.width);
  yogaValues->setProperty(runtime, "currentHeight", currentValues.height);
}

void setYogaTargetSnapshotProperties(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot targetValues) {
  yogaValues->setProperty(runtime, "targetOriginX", targetValues.x);
  yogaValues->setProperty(runtime, "targetGlobalOriginX", targetValues.x);
  yogaValues->setProperty(runtime, "targetOriginY", targetValues.y);
  yogaValues->setProperty(runtime, "targetGlobalOriginY", targetValues.y);
  yogaValues->setProperty(runtime, "targetWidth", targetValues.width);
  yogaValues->setProperty(runtime, "targetHeight", targetValues.height);
}

void setYogaWindowDimensions(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot values) {
  yogaValues->setProperty(runtime, "windowWidth", values.width);
  yogaValues->setProperty(runtime, "windowHeight", values.height);
}

void setYogaCurrentAndTargetWindowDimensions(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot currentValues,
    LayoutSnapshot targetValues) {
  yogaValues->setProperty(
      runtime, "currentWindowWidth", currentValues.windowWidth);
  yogaValues->setProperty(
      runtime, "targetWindowWidth", targetValues.windowWidth);
  yogaValues->setProperty(
      runtime, "currentWindowHeight", currentValues.windowHeight);
  yogaValues->setProperty(
      runtime, "targetWindowHeight", targetValues.windowHeight);
}

template <typename T>
void setYogaCurrentAndTargetValuePair(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    const char *propName,
    T &&currentValue,
    T &&targetValue) {
  const auto current_word_len = 7;
  const auto target_word_len = 6;

  char currentPropName[50];
  char targetPropName[50];

  snprintf(currentPropName, current_word_len + 1, "current");
  snprintf(
      currentPropName + current_word_len, strlen(propName) + 1, "%s", propName);
  snprintf(targetPropName, target_word_len + 1, "target");
  snprintf(
      targetPropName + target_word_len, strlen(propName) + 1, "%s", propName);

  yogaValues->setProperty(runtime, currentPropName, currentValue);
  yogaValues->setProperty(runtime, targetPropName, targetValue);
}

void setYogaTransformMatrix(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    std::array<Float, 16> currentTransformMatrix,
    std::array<Float, 16> targetTransformMatrix) {
  jsi::Array currentMatrix(runtime, 16);
  jsi::Array targetMatrix(runtime, 16);

  for (unsigned int i = 0; i < 16; i++) {
    currentMatrix.setValueAtIndex(runtime, i, currentTransformMatrix[i]);
    targetMatrix.setValueAtIndex(runtime, i, targetTransformMatrix[i]);
  }

  yogaValues->setProperty(runtime, "currentTransformMatrix", currentMatrix);
  yogaValues->setProperty(runtime, "targetTransformMatrix", targetMatrix);
}

void setYogaPropertiesForEnteringAnimation(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot values) {
  setYogaCurrentSnapshotProperties(yogaValues, runtime, values);
  setYogaWindowDimensions(yogaValues, runtime, values);
}

void setYogaPropertiesForExitingAnimation(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot values) {
  setYogaTargetSnapshotProperties(yogaValues, runtime, values);
  setYogaWindowDimensions(yogaValues, runtime, values);
}

void setYogaPropertiesForLayoutTransitionAnimation(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot currentValues,
    LayoutSnapshot targetValues

) {
  setYogaCurrentSnapshotProperties(yogaValues, runtime, currentValues);
  setYogaTargetSnapshotProperties(yogaValues, runtime, targetValues);
  setYogaCurrentAndTargetWindowDimensions(
      yogaValues, runtime, currentValues, targetValues);
}

void setYogaPropertiesForStyleTransitionAnimation(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    StyleSnapshot currentValues,
    StyleSnapshot targetValues) {
  // Style Transition requires setting properties for layout transition too
  setYogaTransformMatrix(
      yogaValues,
      runtime,
      currentValues.transformMatrix,
      targetValues.transformMatrix);

  for (int i = 0; i < numberOfNumericProperties; i++) {
    setYogaCurrentAndTargetValuePair(
        yogaValues,
        runtime,
        numericPropertiesNames[i],
        currentValues.numericPropertiesValues[i],
        targetValues.numericPropertiesValues[i]);
  }

  for (int i = 0; i < numberOfStringProperties; i++) {
    setYogaCurrentAndTargetValuePair(
        yogaValues,
        runtime,
        stringPropertiesNames[i],
        currentValues.stringPropertiesValues[i],
        targetValues.stringPropertiesValues[i]);
  }
}
} // namespace reanimated
#endif
