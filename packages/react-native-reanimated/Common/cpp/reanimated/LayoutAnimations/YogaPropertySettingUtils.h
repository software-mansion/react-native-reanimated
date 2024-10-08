#pragma once
#ifdef RCT_NEW_ARCH_ENABLED
#include "SnapshotUtils.h"

namespace reanimated {
void setYogaPropertiesForEnteringAnimation(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot values);

void setYogaPropertiesForExitingAnimation(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot values);

void setYogaPropertiesForLayoutTransitionAnimation(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    LayoutSnapshot currentValues,
    LayoutSnapshot targetValues);

void setYogaPropertiesForStyleTransitionAnimation(
    const jsi::Object *yogaValues,
    jsi::Runtime &runtime,
    StyleSnapshot currentValues,
    StyleSnapshot targetValues);
} // namespace reanimated
#endif
