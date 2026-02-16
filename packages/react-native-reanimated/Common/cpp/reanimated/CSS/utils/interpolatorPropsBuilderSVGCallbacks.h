#pragma once

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/CSSValueVariant.h>

#include <reanimated/CSS/svg/values/SVGBrush.h>
#include <reanimated/CSS/svg/values/SVGLength.h>
#include <reanimated/CSS/svg/values/SVGPath.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

namespace reanimated::css {

// Callbacks for svg-related props that are stored via `rawProps`.

void addSvgColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGBrush> &value);

void addSvgFillToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGBrush> &value);

void addSvgFillOpacityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value);

void addSvgFillRuleToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSIndex> &value);

void addSvgStrokeToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGBrush> &value);

void addSvgStrokeWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value);

void addSvgStrokeOpacityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value);

void addSvgStrokeDasharrayToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGStrokeDashArray, CSSKeyword> &value);

void addSvgStrokeDashoffsetToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value);

void addSvgStrokeLinecapToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSIndex> &value);

void addSvgStrokeLinejoinToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSIndex> &value);

void addSvgStrokeMiterlimitToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value);

void addSvgVectorEffectToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSIndex> &value);

void addSvgClipRuleToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value);

void addSvgClipPathToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value);

void addSvgTranslateXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value);

void addSvgTranslateYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value);

void addSvgOriginXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value);

void addSvgOriginYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value);

void addSvgScaleXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value);

void addSvgScaleYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value);

void addSvgSkewXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSAngle> &value);

void addSvgSkewYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSAngle> &value);

void addSvgRotationToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSAngle> &value);

void addSvgOpacityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value);

void addSvgCxToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgCyToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgRToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgRxToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgRyToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgHeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgX1ToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgY1ToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgX2ToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgY2ToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgPathDToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGPath> &value);

void addSvgRectRxToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

void addSvgRectRyToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value);

} // namespace reanimated::css
