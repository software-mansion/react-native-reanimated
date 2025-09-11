#include <reanimated/CSS/configs/interpolators/base/common.h>
#include <reanimated/CSS/configs/interpolators/base/view.h>

#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/complex/CSSBoxShadow.h>

#include <reanimated/CSS/configs/interpolators/constants.h>
#include <reanimated/CSS/configs/interpolators/utils.h>
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getViewInterpolators() {
  static const auto VIEW_INTERPOLATORS = mergeInterpolators(
      getFlexInterpolators(),
      getIOSShadowInterpolators(),
      getTransformsInterpolators(),
      InterpolatorFactoriesRecord{
          {"backfaceVisibility", value<CSSKeyword>("visible")},
          {"backgroundColor", value<CSSColor>(TRANSPARENT)},
          {"borderBlockColor", value<CSSColor>(BLACK)},
          {"borderBlockEndColor", value<CSSColor>(BLACK)},
          {"borderBlockStartColor", value<CSSColor>(BLACK)},
          {"borderBottomColor", value<CSSColor>(BLACK)},
          {"borderBottomEndRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderBottomLeftRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderBottomRightRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderBottomStartRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderColor", value<CSSColor>(BLACK)},
          {"borderCurve", value<CSSKeyword>("circular")}, // TODO
          {"borderEndColor", value<CSSColor>(BLACK)},
          {"borderEndEndRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderEndStartRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderLeftColor", value<CSSColor>(BLACK)},
          {"borderRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderRightColor", value<CSSColor>(BLACK)},
          {"borderStartColor", value<CSSColor>(BLACK)},
          {"borderStartEndRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderStartStartRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderStyle", value<CSSKeyword>("solid")},
          {"borderTopColor", value<CSSColor>(BLACK)},
          {"borderTopEndRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderTopLeftRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderTopRightRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"borderTopStartRadius",
           value<CSSLength>(0, {RelativeTo::Self, "width"})},
          {"outlineColor", value<CSSColor>(BLACK)},
          {"outlineOffset", value<CSSDouble>(0)},
          {"outlineStyle", value<CSSKeyword>("solid")},
          {"outlineWidth", value<CSSDouble>(0)},
          {"opacity", value<CSSDouble>(1)},
          {"elevation", value<CSSDouble>(0)},
          {"pointerEvents", value<CSSKeyword>("auto")},
          {"isolation", value<CSSKeyword>("auto")},
          {"cursor", value<CSSKeyword>("auto")},
          {"boxShadow", array({value<CSSBoxShadow>(CSSBoxShadow())})},
          {"mixBlendMode", value<CSSKeyword>("normal")}});
  return VIEW_INTERPOLATORS;
}

} // namespace reanimated::css
