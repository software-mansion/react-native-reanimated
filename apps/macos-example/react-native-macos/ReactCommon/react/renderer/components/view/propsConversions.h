/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/components/view/conversions.h>
#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/propsConversions.h>

#include <optional>

namespace facebook::react {

// Nearly this entire file can be deleted when iterator-style Prop parsing
// ships fully for View

static inline yoga::Style::Edges convertRawProp(
    const PropsParserContext& context,
    const RawProps& rawProps,
    const char* prefix,
    const char* suffix,
    const yoga::Style::Edges& sourceValue,
    const yoga::Style::Edges& defaultValue) {
  auto result = defaultValue;
  result[YGEdgeLeft] = convertRawProp(
      context,
      rawProps,
      "Left",
      sourceValue[YGEdgeLeft],
      defaultValue[YGEdgeLeft],
      prefix,
      suffix);
  result[YGEdgeTop] = convertRawProp(
      context,
      rawProps,
      "Top",
      sourceValue[YGEdgeTop],
      defaultValue[YGEdgeTop],
      prefix,
      suffix);
  result[YGEdgeRight] = convertRawProp(
      context,
      rawProps,
      "Right",
      sourceValue[YGEdgeRight],
      defaultValue[YGEdgeRight],
      prefix,
      suffix);
  result[YGEdgeBottom] = convertRawProp(
      context,
      rawProps,
      "Bottom",
      sourceValue[YGEdgeBottom],
      defaultValue[YGEdgeBottom],
      prefix,
      suffix);
  result[YGEdgeStart] = convertRawProp(
      context,
      rawProps,
      "Start",
      sourceValue[YGEdgeStart],
      defaultValue[YGEdgeStart],
      prefix,
      suffix);
  result[YGEdgeEnd] = convertRawProp(
      context,
      rawProps,
      "End",
      sourceValue[YGEdgeEnd],
      defaultValue[YGEdgeEnd],
      prefix,
      suffix);
  result[YGEdgeHorizontal] = convertRawProp(
      context,
      rawProps,
      "Horizontal",
      sourceValue[YGEdgeHorizontal],
      defaultValue[YGEdgeHorizontal],
      prefix,
      suffix);
  result[YGEdgeVertical] = convertRawProp(
      context,
      rawProps,
      "Vertical",
      sourceValue[YGEdgeVertical],
      defaultValue[YGEdgeVertical],
      prefix,
      suffix);
  result[YGEdgeAll] = convertRawProp(
      context,
      rawProps,
      "",
      sourceValue[YGEdgeAll],
      defaultValue[YGEdgeAll],
      prefix,
      suffix);
  return result;
}

static inline yoga::Style::Edges convertRawProp(
    const PropsParserContext& context,
    const RawProps& rawProps,
    const yoga::Style::Edges& sourceValue,
    const yoga::Style::Edges& defaultValue) {
  auto result = defaultValue;
  result[YGEdgeLeft] = convertRawProp(
      context,
      rawProps,
      "left",
      sourceValue[YGEdgeLeft],
      defaultValue[YGEdgeLeft]);
  result[YGEdgeTop] = convertRawProp(
      context,
      rawProps,
      "top",
      sourceValue[YGEdgeTop],
      defaultValue[YGEdgeTop]);
  result[YGEdgeRight] = convertRawProp(
      context,
      rawProps,
      "right",
      sourceValue[YGEdgeRight],
      defaultValue[YGEdgeRight]);
  result[YGEdgeBottom] = convertRawProp(
      context,
      rawProps,
      "bottom",
      sourceValue[YGEdgeBottom],
      defaultValue[YGEdgeBottom]);
  result[YGEdgeStart] = convertRawProp(
      context,
      rawProps,
      "start",
      sourceValue[YGEdgeStart],
      defaultValue[YGEdgeStart]);
  result[YGEdgeEnd] = convertRawProp(
      context,
      rawProps,
      "end",
      sourceValue[YGEdgeEnd],
      defaultValue[YGEdgeEnd]);
  return result;
}

static inline yoga::Style convertRawProp(
    const PropsParserContext& context,
    const RawProps& rawProps,
    const yoga::Style& sourceValue) {
  yoga::Style yogaStyle{};
  yogaStyle.direction() = convertRawProp(
      context,
      rawProps,
      "direction",
      sourceValue.direction(),
      yogaStyle.direction());
  yogaStyle.flexDirection() = convertRawProp(
      context,
      rawProps,
      "flexDirection",
      sourceValue.flexDirection(),
      yogaStyle.flexDirection());
  yogaStyle.justifyContent() = convertRawProp(
      context,
      rawProps,
      "justifyContent",
      sourceValue.justifyContent(),
      yogaStyle.justifyContent());
  yogaStyle.alignContent() = convertRawProp(
      context,
      rawProps,
      "alignContent",
      sourceValue.alignContent(),
      yogaStyle.alignContent());
  yogaStyle.alignItems() = convertRawProp(
      context,
      rawProps,
      "alignItems",
      sourceValue.alignItems(),
      yogaStyle.alignItems());
  yogaStyle.alignSelf() = convertRawProp(
      context,
      rawProps,
      "alignSelf",
      sourceValue.alignSelf(),
      yogaStyle.alignSelf());
  yogaStyle.positionType() = convertRawProp(
      context,
      rawProps,
      "position",
      sourceValue.positionType(),
      yogaStyle.positionType());
  yogaStyle.flexWrap() = convertRawProp(
      context,
      rawProps,
      "flexWrap",
      sourceValue.flexWrap(),
      yogaStyle.flexWrap());
  yogaStyle.overflow() = convertRawProp(
      context,
      rawProps,
      "overflow",
      sourceValue.overflow(),
      yogaStyle.overflow());
  yogaStyle.display() = convertRawProp(
      context, rawProps, "display", sourceValue.display(), yogaStyle.display());
  yogaStyle.flex() = convertRawProp(
      context, rawProps, "flex", sourceValue.flex(), yogaStyle.flex());
  yogaStyle.flexGrow() = convertRawProp(
      context,
      rawProps,
      "flexGrow",
      sourceValue.flexGrow(),
      yogaStyle.flexGrow());
  yogaStyle.flexShrink() = convertRawProp(
      context,
      rawProps,
      "flexShrink",
      sourceValue.flexShrink(),
      yogaStyle.flexShrink());
  yogaStyle.flexBasis() = convertRawProp(
      context,
      rawProps,
      "flexBasis",
      sourceValue.flexBasis(),
      yogaStyle.flexBasis());
  yogaStyle.margin() = convertRawProp(
      context,
      rawProps,
      "margin",
      "",
      sourceValue.margin(),
      yogaStyle.margin());
  yogaStyle.position() = convertRawProp(
      context, rawProps, sourceValue.position(), yogaStyle.position());
  yogaStyle.padding() = convertRawProp(
      context,
      rawProps,
      "padding",
      "",
      sourceValue.padding(),
      yogaStyle.padding());

  yogaStyle.gap()[YGGutterRow] = convertRawProp(
      context,
      rawProps,
      "rowGap",
      sourceValue.gap()[YGGutterRow],
      yogaStyle.gap()[YGGutterRow]);

  yogaStyle.gap()[YGGutterColumn] = convertRawProp(
      context,
      rawProps,
      "columnGap",
      sourceValue.gap()[YGGutterColumn],
      yogaStyle.gap()[YGGutterColumn]);

  yogaStyle.gap()[YGGutterAll] = convertRawProp(
      context,
      rawProps,
      "gap",
      sourceValue.gap()[YGGutterAll],
      yogaStyle.gap()[YGGutterAll]);

  yogaStyle.border() = convertRawProp(
      context,
      rawProps,
      "border",
      "Width",
      sourceValue.border(),
      yogaStyle.border());

  yogaStyle.setDimension(
      YGDimensionWidth,
      convertRawProp(
          context,
          rawProps,
          "width",
          sourceValue.dimension(YGDimensionWidth),
          {}));
  yogaStyle.setDimension(
      YGDimensionHeight,
      convertRawProp(
          context,
          rawProps,
          "height",
          sourceValue.dimension(YGDimensionHeight),
          {}));

  yogaStyle.setMinDimension(
      YGDimensionWidth,
      convertRawProp(
          context,
          rawProps,
          "minWidth",
          sourceValue.minDimension(YGDimensionWidth),
          {}));
  yogaStyle.setMinDimension(
      YGDimensionHeight,
      convertRawProp(
          context,
          rawProps,
          "minHeight",
          sourceValue.minDimension(YGDimensionHeight),
          {}));

  yogaStyle.setMaxDimension(
      YGDimensionWidth,
      convertRawProp(
          context,
          rawProps,
          "maxWidth",
          sourceValue.maxDimension(YGDimensionWidth),
          {}));
  yogaStyle.setMaxDimension(
      YGDimensionHeight,
      convertRawProp(
          context,
          rawProps,
          "maxHeight",
          sourceValue.maxDimension(YGDimensionHeight),
          {}));

  yogaStyle.aspectRatio() = convertRawProp(
      context,
      rawProps,
      "aspectRatio",
      sourceValue.aspectRatio(),
      yogaStyle.aspectRatio());

  return yogaStyle;
}

// This can be deleted when non-iterator ViewProp parsing is deleted
template <typename T>
static inline CascadedRectangleCorners<T> convertRawProp(
    const PropsParserContext& context,
    const RawProps& rawProps,
    const char* prefix,
    const char* suffix,
    const CascadedRectangleCorners<T>& sourceValue,
    const CascadedRectangleCorners<T>& defaultValue) {
  CascadedRectangleCorners<T> result;

  result.topLeft = convertRawProp(
      context,
      rawProps,
      "TopLeft",
      sourceValue.topLeft,
      defaultValue.topLeft,
      prefix,
      suffix);
  result.topRight = convertRawProp(
      context,
      rawProps,
      "TopRight",
      sourceValue.topRight,
      defaultValue.topRight,
      prefix,
      suffix);
  result.bottomLeft = convertRawProp(
      context,
      rawProps,
      "BottomLeft",
      sourceValue.bottomLeft,
      defaultValue.bottomLeft,
      prefix,
      suffix);
  result.bottomRight = convertRawProp(
      context,
      rawProps,
      "BottomRight",
      sourceValue.bottomRight,
      defaultValue.bottomRight,
      prefix,
      suffix);

  result.topStart = convertRawProp(
      context,
      rawProps,
      "TopStart",
      sourceValue.topStart,
      defaultValue.topStart,
      prefix,
      suffix);
  result.topEnd = convertRawProp(
      context,
      rawProps,
      "TopEnd",
      sourceValue.topEnd,
      defaultValue.topEnd,
      prefix,
      suffix);
  result.bottomStart = convertRawProp(
      context,
      rawProps,
      "BottomStart",
      sourceValue.bottomStart,
      defaultValue.bottomStart,
      prefix,
      suffix);
  result.bottomEnd = convertRawProp(
      context,
      rawProps,
      "BottomEnd",
      sourceValue.bottomEnd,
      defaultValue.bottomEnd,
      prefix,
      suffix);
  result.endEnd = convertRawProp(
      context,
      rawProps,
      "EndEnd",
      sourceValue.endEnd,
      defaultValue.endEnd,
      prefix,
      suffix);
  result.endStart = convertRawProp(
      context,
      rawProps,
      "EndStart",
      sourceValue.endStart,
      defaultValue.endStart,
      prefix,
      suffix);
  result.startEnd = convertRawProp(
      context,
      rawProps,
      "StartEnd",
      sourceValue.startEnd,
      defaultValue.startEnd,
      prefix,
      suffix);
  result.startStart = convertRawProp(
      context,
      rawProps,
      "StartStart",
      sourceValue.startStart,
      defaultValue.startStart,
      prefix,
      suffix);

  result.all = convertRawProp(
      context, rawProps, "", sourceValue.all, defaultValue.all, prefix, suffix);

  return result;
}

template <typename T>
static inline CascadedRectangleEdges<T> convertRawProp(
    const PropsParserContext& context,
    const RawProps& rawProps,
    const char* prefix,
    const char* suffix,
    const CascadedRectangleEdges<T>& sourceValue,
    const CascadedRectangleEdges<T>& defaultValue) {
  CascadedRectangleEdges<T> result;

  result.left = convertRawProp(
      context,
      rawProps,
      "Left",
      sourceValue.left,
      defaultValue.left,
      prefix,
      suffix);
  result.right = convertRawProp(
      context,
      rawProps,
      "Right",
      sourceValue.right,
      defaultValue.right,
      prefix,
      suffix);
  result.top = convertRawProp(
      context,
      rawProps,
      "Top",
      sourceValue.top,
      defaultValue.top,
      prefix,
      suffix);
  result.bottom = convertRawProp(
      context,
      rawProps,
      "Bottom",
      sourceValue.bottom,
      defaultValue.bottom,
      prefix,
      suffix);

  result.start = convertRawProp(
      context,
      rawProps,
      "Start",
      sourceValue.start,
      defaultValue.start,
      prefix,
      suffix);
  result.end = convertRawProp(
      context,
      rawProps,
      "End",
      sourceValue.end,
      defaultValue.end,
      prefix,
      suffix);
  result.horizontal = convertRawProp(
      context,
      rawProps,
      "Horizontal",
      sourceValue.horizontal,
      defaultValue.horizontal,
      prefix,
      suffix);
  result.vertical = convertRawProp(
      context,
      rawProps,
      "Vertical",
      sourceValue.vertical,
      defaultValue.vertical,
      prefix,
      suffix);
  result.block = convertRawProp(
      context,
      rawProps,
      "Block",
      sourceValue.block,
      defaultValue.block,
      prefix,
      suffix);
  result.blockEnd = convertRawProp(
      context,
      rawProps,
      "BlockEnd",
      sourceValue.blockEnd,
      defaultValue.blockEnd,
      prefix,
      suffix);
  result.blockStart = convertRawProp(
      context,
      rawProps,
      "BlockStart",
      sourceValue.blockStart,
      defaultValue.blockStart,
      prefix,
      suffix);

  result.all = convertRawProp(
      context, rawProps, "", sourceValue.all, defaultValue.all, prefix, suffix);

  return result;
}

// This can be deleted when non-iterator ViewProp parsing is deleted
static inline ViewEvents convertRawProp(
    const PropsParserContext& context,
    const RawProps& rawProps,
    const ViewEvents& sourceValue,
    const ViewEvents& defaultValue) {
  ViewEvents result{};
  using Offset = ViewEvents::Offset;

  result[Offset::PointerEnter] = convertRawProp(
      context,
      rawProps,
      "onPointerEnter",
      sourceValue[Offset::PointerEnter],
      defaultValue[Offset::PointerEnter]);
  result[Offset::PointerMove] = convertRawProp(
      context,
      rawProps,
      "onPointerMove",
      sourceValue[Offset::PointerMove],
      defaultValue[Offset::PointerMove]);
  result[Offset::PointerLeave] = convertRawProp(
      context,
      rawProps,
      "onPointerLeave",
      sourceValue[Offset::PointerLeave],
      defaultValue[Offset::PointerLeave]);

  // Experimental W3C Pointer callbacks
  result[Offset::PointerEnterCapture] = convertRawProp(
      context,
      rawProps,
      "onPointerEnterCapture",
      sourceValue[Offset::PointerEnterCapture],
      defaultValue[Offset::PointerEnterCapture]);
  result[Offset::PointerMoveCapture] = convertRawProp(
      context,
      rawProps,
      "onPointerMoveCapture",
      sourceValue[Offset::PointerMoveCapture],
      defaultValue[Offset::PointerMoveCapture]);
  result[Offset::PointerLeaveCapture] = convertRawProp(
      context,
      rawProps,
      "onPointerLeaveCapture",
      sourceValue[Offset::PointerLeaveCapture],
      defaultValue[Offset::PointerLeaveCapture]);
  result[Offset::PointerOver] = convertRawProp(
      context,
      rawProps,
      "onPointerOver",
      sourceValue[Offset::PointerOver],
      defaultValue[Offset::PointerOver]);
  result[Offset::PointerOut] = convertRawProp(
      context,
      rawProps,
      "onPointerOut",
      sourceValue[Offset::PointerOut],
      defaultValue[Offset::PointerOut]);
  result[Offset::Click] = convertRawProp(
      context,
      rawProps,
      "onClick",
      sourceValue[Offset::Click],
      defaultValue[Offset::Click]);
  result[Offset::ClickCapture] = convertRawProp(
      context,
      rawProps,
      "onClickCapture",
      sourceValue[Offset::ClickCapture],
      defaultValue[Offset::ClickCapture]);
  result[Offset::PointerDown] = convertRawProp(
      context,
      rawProps,
      "onPointerDown",
      sourceValue[Offset::PointerDown],
      defaultValue[Offset::PointerDown]);
  result[Offset::PointerDownCapture] = convertRawProp(
      context,
      rawProps,
      "onPointerDownCapture",
      sourceValue[Offset::PointerDownCapture],
      defaultValue[Offset::PointerDownCapture]);
  result[Offset::PointerUp] = convertRawProp(
      context,
      rawProps,
      "onPointerUp",
      sourceValue[Offset::PointerUp],
      defaultValue[Offset::PointerUp]);
  result[Offset::PointerUpCapture] = convertRawProp(
      context,
      rawProps,
      "onPointerUpCapture",
      sourceValue[Offset::PointerUpCapture],
      defaultValue[Offset::PointerUpCapture]);
  // TODO: gotPointerCapture & lostPointerCapture

  // PanResponder callbacks
  result[Offset::MoveShouldSetResponder] = convertRawProp(
      context,
      rawProps,
      "onMoveShouldSetResponder",
      sourceValue[Offset::MoveShouldSetResponder],
      defaultValue[Offset::MoveShouldSetResponder]);
  result[Offset::MoveShouldSetResponderCapture] = convertRawProp(
      context,
      rawProps,
      "onMoveShouldSetResponderCapture",
      sourceValue[Offset::MoveShouldSetResponderCapture],
      defaultValue[Offset::MoveShouldSetResponderCapture]);
  result[Offset::StartShouldSetResponder] = convertRawProp(
      context,
      rawProps,
      "onStartShouldSetResponder",
      sourceValue[Offset::StartShouldSetResponder],
      defaultValue[Offset::StartShouldSetResponder]);
  result[Offset::StartShouldSetResponderCapture] = convertRawProp(
      context,
      rawProps,
      "onStartShouldSetResponderCapture",
      sourceValue[Offset::StartShouldSetResponderCapture],
      defaultValue[Offset::StartShouldSetResponderCapture]);
  result[Offset::ResponderGrant] = convertRawProp(
      context,
      rawProps,
      "onResponderGrant",
      sourceValue[Offset::ResponderGrant],
      defaultValue[Offset::ResponderGrant]);
  result[Offset::ResponderReject] = convertRawProp(
      context,
      rawProps,
      "onResponderReject",
      sourceValue[Offset::ResponderReject],
      defaultValue[Offset::ResponderReject]);
  result[Offset::ResponderStart] = convertRawProp(
      context,
      rawProps,
      "onResponderStart",
      sourceValue[Offset::ResponderStart],
      defaultValue[Offset::ResponderStart]);
  result[Offset::ResponderEnd] = convertRawProp(
      context,
      rawProps,
      "onResponderEnd",
      sourceValue[Offset::ResponderEnd],
      defaultValue[Offset::ResponderEnd]);
  result[Offset::ResponderRelease] = convertRawProp(
      context,
      rawProps,
      "onResponderRelease",
      sourceValue[Offset::ResponderRelease],
      defaultValue[Offset::ResponderRelease]);
  result[Offset::ResponderMove] = convertRawProp(
      context,
      rawProps,
      "onResponderMove",
      sourceValue[Offset::ResponderMove],
      defaultValue[Offset::ResponderMove]);
  result[Offset::ResponderTerminate] = convertRawProp(
      context,
      rawProps,
      "onResponderTerminate",
      sourceValue[Offset::ResponderTerminate],
      defaultValue[Offset::ResponderTerminate]);
  result[Offset::ResponderTerminationRequest] = convertRawProp(
      context,
      rawProps,
      "onResponderTerminationRequest",
      sourceValue[Offset::ResponderTerminationRequest],
      defaultValue[Offset::ResponderTerminationRequest]);
  result[Offset::ShouldBlockNativeResponder] = convertRawProp(
      context,
      rawProps,
      "onShouldBlockNativeResponder",
      sourceValue[Offset::ShouldBlockNativeResponder],
      defaultValue[Offset::ShouldBlockNativeResponder]);

  // Touch events
  result[Offset::TouchStart] = convertRawProp(
      context,
      rawProps,
      "onTouchStart",
      sourceValue[Offset::TouchStart],
      defaultValue[Offset::TouchStart]);
  result[Offset::TouchMove] = convertRawProp(
      context,
      rawProps,
      "onTouchMove",
      sourceValue[Offset::TouchMove],
      defaultValue[Offset::TouchMove]);
  result[Offset::TouchEnd] = convertRawProp(
      context,
      rawProps,
      "onTouchEnd",
      sourceValue[Offset::TouchEnd],
      defaultValue[Offset::TouchEnd]);
  result[Offset::TouchCancel] = convertRawProp(
      context,
      rawProps,
      "onTouchCancel",
      sourceValue[Offset::TouchCancel],
      defaultValue[Offset::TouchCancel]);

  return result;
}

} // namespace facebook::react
