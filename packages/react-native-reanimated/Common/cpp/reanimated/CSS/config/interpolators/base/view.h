#pragma once

#include <reanimated/CSS/config/interpolators/base/common.h>

#include <reanimated/CSS/common/values/CSSBoolean.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord VIEW_INTERPOLATORS = mergeInterpolators(
    FLEX_INTERPOLATORS,
    SHADOW_INTERPOLATORS_IOS,
    TRANSFORMS_INTERPOLATORS,
    InterpolatorFactoriesRecord{
        {"backfaceVisibility", value<CSSKeyword>("visible")},
        {"backgroundColor", value<CSSColor>(TRANSPARENT)},
        {"borderBlockColor", value<CSSColor>(BLACK)},
        {"borderBlockEndColor", value<CSSColor>(BLACK)},
        {"borderBlockStartColor", value<CSSColor>(BLACK)},
        {"borderBottomColor", value<CSSColor>(BLACK)},
        {"borderBottomEndRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderBottomLeftRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderBottomRightRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderBottomStartRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderColor", value<CSSColor>(BLACK)},
        {"borderCurve", value<CSSKeyword>("circular")}, // TODO
        {"borderEndColor", value<CSSColor>(BLACK)},
        {"borderEndEndRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderEndStartRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderLeftColor", value<CSSColor>(BLACK)},
        {"borderRadius", value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderRightColor", value<CSSColor>(BLACK)},
        {"borderStartColor", value<CSSColor>(BLACK)},
        {"borderStartEndRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderStartStartRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderStyle", value<CSSKeyword>("solid")},
        {"borderTopColor", value<CSSColor>(BLACK)},
        {"borderTopEndRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderTopLeftRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderTopRightRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"borderTopStartRadius",
         value<CSSDimension>(RelativeTo::Self, "width", 0)},
        {"outlineColor", value<CSSColor>(BLACK)},
        {"outlineOffset", value<CSSDouble>(0)},
        {"outlineStyle", value<CSSKeyword>("solid")},
        {"outlineWidth", value<CSSDouble>(0)},
        {"opacity", value<CSSDouble>(1)},
        {"elevation", value<CSSDouble>(0)},
        {"pointerEvents", value<CSSKeyword>("auto")},
        {"isolation", value<CSSKeyword>("auto")},
        {"cursor", value<CSSKeyword>("auto")},
        {"boxShadow",
         array({record({
             {"offsetX", value<CSSDouble>(0)},
             {"offsetY", value<CSSDouble>(0)},
#ifdef ANDROID
             // For some reason Android crashes when blurRadius is smaller
             // than 1, so we use a custom value type that will never be
             // smaller than 1
             {"blurRadius", value<CSSShadowRadiusAndroid>(1)},
#else
             {"blurRadius", value<CSSDouble>(0)},
#endif
             {"spreadDistance", value<CSSDouble>(0)},
             {"color", value<CSSColor>(BLACK)},
             {"inset", value<CSSBoolean>(false)},
         })})},
        {"mixBlendMode", value<CSSKeyword>("normal")}});

} // namespace reanimated::css
