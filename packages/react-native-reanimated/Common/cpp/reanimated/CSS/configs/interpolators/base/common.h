#pragma once

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

const InterpolatorFactoriesRecord FLEX_INTERPOLATORS = {
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
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"boxSizing", value<CSSKeyword>("border-box")},
    {"display", value<CSSDisplay>("flex")},
    {"end", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"flex", value<CSSDouble>(0)},
    {"flexBasis",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"flexDirection", value<CSSKeyword>("column")},
    {"rowGap", value<CSSLength>(RelativeTo::Self, "height", 0)},
    {"columnGap", value<CSSLength>(RelativeTo::Self, "width", 0)},
    {"flexGrow", value<CSSDouble>(0)},
    {"flexShrink", value<CSSDouble>(0)},
    {"flexWrap", value<CSSKeyword>("no-wrap")},
    {"height",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"justifyContent", value<CSSKeyword>("flex-start")},
    {"left", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"margin", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginBottom",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginEnd", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginHorizontal",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginLeft",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginRight",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginStart",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginTop", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginVertical",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"maxHeight",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"maxWidth",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"minHeight",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"minWidth",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"overflow", value<CSSKeyword>("visible")},
    {"padding", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingBottom",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingEnd",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingHorizontal",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingLeft",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingRight",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingStart",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingTop",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingVertical",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"position", value<CSSKeyword>("relative")},
    {"right",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"start",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"top", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"width",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"zIndex", value<CSSInteger>(0)},
    {"direction", value<CSSKeyword>("inherit")}};

const InterpolatorFactoriesRecord SHADOW_INTERPOLATORS_IOS = {
    {"shadowColor", value<CSSColor>(BLACK)},
    {"shadowOffset",
     record({{"width", value<CSSDouble>(0)}, {"height", value<CSSDouble>(0)}})},
    {"shadowRadius", value<CSSDouble>(0)},
    {"shadowOpacity", value<CSSDouble>(1)}};

const InterpolatorFactoriesRecord TRANSFORMS_INTERPOLATORS = {
    {"transformOrigin",
     array(
         {value<CSSLength>(RelativeTo::Self, "width", "50%"),
          value<CSSLength>(RelativeTo::Self, "height", "50%"),
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
           transformOp<TranslateXOperation>(RelativeTo::Self, "width", 0)},
          {"translateY",
           transformOp<TranslateYOperation>(RelativeTo::Self, "height", 0)},
          {"skewX", transformOp<SkewXOperation>("0deg")},
          {"skewY", transformOp<SkewYOperation>("0deg")},
          {"matrix",
           transformOp<MatrixOperation>(TransformMatrix3D::Identity())}})},
};

} // namespace reanimated::css
