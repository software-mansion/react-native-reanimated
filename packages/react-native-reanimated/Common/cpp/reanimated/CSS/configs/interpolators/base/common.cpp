#include <reanimated/CSS/configs/interpolators/base/common.h>

#include <reanimated/CSS/configs/interpolators/constants.h>
#include <reanimated/CSS/configs/interpolators/utils.h>

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>
#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getFlexInterpolators() {
  static const InterpolatorFactoriesRecord FLEX_INTERPOLATORS = {
      {"alignContent", value<CSSKeyword>("flex-start")},
      {"alignItems", value<CSSKeyword>("stretch")},
      {"alignSelf", value<CSSKeyword>("auto")},
      {"aspectRatio", value<CSSDouble, CSSKeyword>("auto")},
      {"borderBottomWidth", value<CSSDouble>(0)},
      {"borderEndWidth", value<CSSDouble>(0)},
      {"borderLeftWidth", value<CSSDouble>(0)},
      {"borderRightWidth", value<CSSDouble>(0)},
      {"borderStartWidth", value<CSSDouble>(0)},
      {"borderTopWidth", value<CSSDouble>(0)},
      {"borderWidth", value<CSSDouble>(0)},
      {"bottom",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
      {"boxSizing", value<CSSKeyword>("border-box")},
      {"display", value<CSSDisplay>("flex")},
      {"end",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
      {"flex", value<CSSDouble>(0)},
      {"flexBasis",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
      {"flexDirection", value<CSSKeyword>("column")},
      {"rowGap", value<CSSLength>(0, {RelativeTo::Self, "height"})},
      {"columnGap", value<CSSLength>(0, {RelativeTo::Self, "width"})},
      {"flexGrow", value<CSSDouble>(0)},
      {"flexShrink", value<CSSDouble>(0)},
      {"flexWrap", value<CSSKeyword>("no-wrap")},
      {"height",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
      {"justifyContent", value<CSSKeyword>("flex-start")},
      {"left",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
      {"margin",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"marginBottom",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"marginEnd",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"marginHorizontal",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"marginLeft",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"marginRight",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"marginStart",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"marginTop",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"marginVertical",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"maxHeight",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
      {"maxWidth",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
      {"minHeight",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
      {"minWidth",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
      {"overflow", value<CSSKeyword>("visible")},
      {"padding",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"paddingBottom",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"paddingEnd",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"paddingHorizontal",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"paddingLeft",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"paddingRight",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"paddingStart",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"paddingTop",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"paddingVertical",
       value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
      {"position", value<CSSKeyword>("relative")},
      {"right",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
      {"start",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
      {"top",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
      {"width",
       value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
      {"zIndex", value<CSSInteger>(0)},
      {"direction", value<CSSKeyword>("inherit")}};
  return FLEX_INTERPOLATORS;
}

const InterpolatorFactoriesRecord &getIOSShadowInterpolators() {
  static const InterpolatorFactoriesRecord SHADOW_INTERPOLATORS_IOS = {
      {"shadowColor", value<CSSColor>(BLACK)},
      {"shadowOffset",
       record(
           {{"width", value<CSSDouble>(0)}, {"height", value<CSSDouble>(0)}})},
      {"shadowRadius", value<CSSDouble>(0)},
      {"shadowOpacity", value<CSSDouble>(1)}};
  return SHADOW_INTERPOLATORS_IOS;
}

const InterpolatorFactoriesRecord &getTransformsInterpolators() {
  static const InterpolatorFactoriesRecord TRANSFORMS_INTERPOLATORS = {
      {"transformOrigin",
       array(
           {value<CSSLength>("50%", {RelativeTo::Self, "width"}),
            value<CSSLength>("50%", {RelativeTo::Self, "height"}),
            value<CSSDouble>(0)})},
      {"transform",
       transforms(
           {{"perspective",
             transformOp<PerspectiveOperation>(0)}, // 0 - no perspective
            {"rotate", transformOp<RotateOperation>("0deg")},
            {"rotateX", transformOp<RotateXOperation>("0deg")},
            {"rotateY", transformOp<RotateYOperation>("0deg")},
            {"rotateZ", transformOp<RotateZOperation>("0deg")},
            {"scale", transformOp<ScaleOperation>(1)},
            {"scaleX", transformOp<ScaleXOperation>(1)},
            {"scaleY", transformOp<ScaleYOperation>(1)},
            {"translateX",
             transformOp<TranslateXOperation>(0, {RelativeTo::Self, "width"})},
            {"translateY",
             transformOp<TranslateYOperation>(0, {RelativeTo::Self, "height"})},
            {"skewX", transformOp<SkewXOperation>("0deg")},
            {"skewY", transformOp<SkewYOperation>("0deg")},
            {"matrix", transformOp<MatrixOperation>(TransformMatrix2D())}})},
  };
  return TRANSFORMS_INTERPOLATORS;
}

} // namespace reanimated::css
