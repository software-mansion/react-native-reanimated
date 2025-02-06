#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/style/groups/CSSArray.h>
#include <reanimated/CSS/common/style/groups/CSSRecord.h>
#include <reanimated/CSS/common/style/groups/CSSTransform.h>
#include <reanimated/CSS/common/style/groups/CSSTuple.h>

#include <reanimated/CSS/common/style/values/CSSAngle.h>
#include <reanimated/CSS/common/style/values/CSSBoolean.h>
#include <reanimated/CSS/common/style/values/CSSColor.h>
#include <reanimated/CSS/common/style/values/CSSDimension.h>
#include <reanimated/CSS/common/style/values/CSSDiscreteArray.h>
#include <reanimated/CSS/common/style/values/CSSKeyword.h>
#include <reanimated/CSS/common/style/values/CSSNumber.h>

#include <reanimated/CSS/common/style/values/CSSValueVariant.h>

namespace reanimated {

template <typename... T>
using Variant = CSSValueVariant<T...>;

using CSSStyle = CSSRecord<
    // Layout and Positioning
    Field<"flex", CSSDouble>,
    Field<"flexBasis", Variant<CSSDimension, CSSKeyword>>,
    Field<"flexDirection", CSSKeyword>,
    Field<"justifyContent", CSSKeyword>,
    Field<"alignItems", CSSKeyword>,
    Field<"alignSelf", CSSKeyword>,
    Field<"alignContent", CSSKeyword>,
    Field<"flexGrow", CSSDouble>,
    Field<"flexShrink", CSSDouble>,
    Field<"flexWrap", CSSKeyword>,
    Field<"rowGap", CSSDimension>,
    Field<"columnGap", CSSDimension>,
    Field<"start", Variant<CSSDimension, CSSKeyword>>,
    Field<"end", Variant<CSSDimension, CSSKeyword>>,
    Field<"direction", CSSKeyword>,

    // Dimensions
    Field<"height", Variant<CSSDimension, CSSKeyword>>,
    Field<"width", Variant<CSSDimension, CSSKeyword>>,
    Field<"maxHeight", Variant<CSSDimension, CSSKeyword>>,
    Field<"maxWidth", Variant<CSSDimension, CSSKeyword>>,
    Field<"minHeight", Variant<CSSDimension, CSSKeyword>>,
    Field<"minWidth", Variant<CSSDimension, CSSKeyword>>,

    // Margins
    Field<"margin", Variant<CSSDimension, CSSKeyword>>,
    Field<"marginTop", Variant<CSSDimension, CSSKeyword>>,
    Field<"marginRight", Variant<CSSDimension, CSSKeyword>>,
    Field<"marginBottom", Variant<CSSDimension, CSSKeyword>>,
    Field<"marginLeft", Variant<CSSDimension, CSSKeyword>>,
    Field<"marginStart", Variant<CSSDimension, CSSKeyword>>,
    Field<"marginEnd", Variant<CSSDimension, CSSKeyword>>,
    Field<"marginHorizontal", Variant<CSSDimension, CSSKeyword>>,
    Field<"marginVertical", Variant<CSSDimension, CSSKeyword>>,

    // Paddings
    Field<"padding", Variant<CSSDimension, CSSKeyword>>,
    Field<"paddingTop", Variant<CSSDimension, CSSKeyword>>,
    Field<"paddingRight", Variant<CSSDimension, CSSKeyword>>,
    Field<"paddingBottom", Variant<CSSDimension, CSSKeyword>>,
    Field<"paddingLeft", Variant<CSSDimension, CSSKeyword>>,
    Field<"paddingStart", Variant<CSSDimension, CSSKeyword>>,
    Field<"paddingEnd", Variant<CSSDimension, CSSKeyword>>,
    Field<"paddingHorizontal", Variant<CSSDimension, CSSKeyword>>,
    Field<"paddingVertical", Variant<CSSDimension, CSSKeyword>>,

    // Insets
    Field<"top", Variant<CSSDimension, CSSKeyword>>,
    Field<"bottom", Variant<CSSDimension, CSSKeyword>>,
    Field<"left", Variant<CSSDimension, CSSKeyword>>,
    Field<"right", Variant<CSSDimension, CSSKeyword>>,

    // Other Layout
    Field<"position", CSSKeyword>,
    Field<"display", CSSKeyword>,
    Field<"overflow", CSSKeyword>,
    Field<"zIndex", CSSInteger>,
    Field<"aspectRatio", Variant<CSSDouble, CSSKeyword>>,

    // Appearance
    // Colors
    Field<"backgroundColor", CSSColor>,
    Field<"color", CSSColor>,
    Field<"textDecorationColor", CSSColor>,
    Field<"textShadowColor", CSSColor>,
    Field<"borderColor", CSSColor>,
    Field<"borderTopColor", CSSColor>,
    Field<"borderBlockStartColor", CSSColor>,
    Field<"borderRightColor", CSSColor>,
    Field<"borderEndColor", CSSColor>,
    Field<"borderBottomColor", CSSColor>,
    Field<"borderBlockEndColor", CSSColor>,
    Field<"borderLeftColor", CSSColor>,
    Field<"borderStartColor", CSSColor>,
    Field<"borderBlockColor", CSSColor>,
    Field<"outlineColor", CSSColor>,
    Field<"shadowColor", CSSColor>,
    Field<"overlayColor", CSSColor>,
    Field<"tintColor", CSSColor>,

    // Shadows
    Field<
        "shadowOffset",
        CSSRecord<Field<"width", CSSDouble>, Field<"height", CSSDouble>>>,
    Field<"shadowRadius", CSSDouble>,
    Field<"shadowOpacity", CSSDouble>,
    Field<"elevation", CSSDouble>,
    Field<
        "textShadowOffset",
        CSSRecord<Field<"width", CSSDouble>, Field<"height", CSSDouble>>>,
    Field<"textShadowRadius", CSSDouble>,
    Field<
        "boxShadow",
        CSSArray<CSSRecord<
            Field<"offsetX", CSSDouble>,
            Field<"offsetY", CSSDouble>,
            Field<"blurRadius", CSSDouble>,
            Field<"spreadDistance", CSSDouble>,
            Field<"color", CSSColor>,
            Field<"inset", CSSBoolean>>>>,

    // Borders
    Field<"borderRadius", CSSDimension>,
    Field<"borderTopLeftRadius", CSSDimension>,
    Field<"borderTopStartRadius", CSSDimension>,
    Field<"borderStartStartRadius", CSSDimension>,
    Field<"borderTopRightRadius", CSSDimension>,
    Field<"borderTopEndRadius", CSSDimension>,
    Field<"borderStartEndRadius", CSSDimension>,
    Field<"borderBottomLeftRadius", CSSDimension>,
    Field<"borderBottomStartRadius", CSSDimension>,
    Field<"borderEndStartRadius", CSSDimension>,
    Field<"borderBottomRightRadius", CSSDimension>,
    Field<"borderBottomEndRadius", CSSDimension>,
    Field<"borderEndEndRadius", CSSDimension>,
    Field<"borderWidth", CSSDouble>,
    Field<"borderTopWidth", CSSDouble>,
    Field<"borderStartWidth", CSSDouble>,
    Field<"borderBottomWidth", CSSDouble>,
    Field<"borderEndWidth", CSSDouble>,
    Field<"borderLeftWidth", CSSDouble>,
    Field<"borderRightWidth", CSSDouble>,
    Field<"borderStyle", CSSKeyword>,

    // Outlines
    Field<"outlineOffset", CSSDouble>,
    Field<"outlineStyle", CSSKeyword>,
    Field<"outlineWidth", CSSDouble>,

    // Transform
    Field<"transformOrigin", CSSTuple<CSSDimension, CSSDimension, CSSDouble>>,
    Field<
        "transform",
        CSSTransform<
            TransformOp<"perspective", CSSDouble>,
            TransformOp<"rotate", CSSAngle>,
            TransformOp<"rotateX", CSSAngle>,
            TransformOp<"rotateY", CSSAngle>,
            TransformOp<"rotateZ", CSSAngle>,
            TransformOp<"scale", CSSDouble>,
            TransformOp<"scaleX", CSSDouble>,
            TransformOp<"scaleY", CSSDouble>,
            TransformOp<"translateX", CSSDimension>,
            TransformOp<"translateY", CSSDimension>,
            TransformOp<"skewX", CSSAngle>,
            TransformOp<"skewY", CSSAngle>,
            TransformOp<"matrix", CSSTransformMatrix>>>,

    // Others
    Field<"backfaceVisibility", CSSKeyword>,
    Field<"opacity", CSSDouble>,
    Field<"mixBlendMode", CSSKeyword>,

    // Typography
    Field<"fontFamily", CSSKeyword>,
    Field<"fontSize", CSSDouble>,
    Field<"fontStyle", CSSKeyword>,
    Field<"fontVariant", CSSDiscreteArray<CSSKeyword>>,
    Field<"fontWeight", CSSKeyword>,
    Field<"textAlign", CSSKeyword>,
    Field<"textAlignVertical", CSSKeyword>,
    Field<"letterSpacing", CSSDouble>,
    Field<"lineHeight", CSSDouble>,
    Field<"textTransform", CSSKeyword>,
    Field<"textDecorationLine", CSSKeyword>,
    Field<"textDecorationStyle", CSSKeyword>,
    Field<"userSelect", CSSKeyword>,
    Field<"includeFontPadding", CSSBoolean>,

    // Others
    Field<"resizeMode", CSSKeyword>,
    Field<"cursor", CSSKeyword>,
    Field<"pointerEvents", CSSKeyword>,
    Field<"isolation", CSSKeyword>>;
} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
