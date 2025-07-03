#pragma once

#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <reanimated/CSS/config/interpolators/constants.h>
#include <reanimated/CSS/config/interpolators/utils.h>

#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSDimension.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
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
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"boxSizing", value<CSSKeyword>("border-box")},
    {"display", value<CSSDisplay>("flex")},
    {"end",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"flex", value<CSSDouble>(0)},
    {"flexBasis",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"flexDirection", value<CSSKeyword>("column")},
    {"rowGap", value<CSSDimension>(RelativeTo::Self, "height", 0)},
    {"columnGap", value<CSSDimension>(RelativeTo::Self, "width", 0)},
    {"flexGrow", value<CSSDouble>(0)},
    {"flexShrink", value<CSSDouble>(0)},
    {"flexWrap", value<CSSKeyword>("no-wrap")},
    {"height",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"justifyContent", value<CSSKeyword>("flex-start")},
    {"left",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"margin", value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginBottom",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginEnd",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginHorizontal",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginLeft",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginRight",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginStart",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginTop",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginVertical",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"maxHeight",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"maxWidth",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"minHeight",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"minWidth",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"overflow", value<CSSKeyword>("visible")},
    {"padding",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingBottom",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingEnd",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingHorizontal",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingLeft",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingRight",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingStart",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingTop",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingVertical",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"position", value<CSSKeyword>("relative")},
    {"right",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"start",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"top",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"width",
     value<CSSDimension, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
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
         {value<CSSDimension>(RelativeTo::Self, "width", "50%"),
          value<CSSDimension>(RelativeTo::Self, "height", "50%"),
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
           transformOp<MatrixOperation>(TransformMatrix::Identity())}})},
};

} // namespace reanimated::css
