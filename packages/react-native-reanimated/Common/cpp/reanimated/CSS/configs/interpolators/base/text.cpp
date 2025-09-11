#include <reanimated/CSS/configs/interpolators/base/text.h>
#include <reanimated/CSS/configs/interpolators/base/view.h>
#include <reanimated/CSS/configs/interpolators/constants.h>
#include <reanimated/CSS/configs/interpolators/utils.h>

#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSDiscreteArray.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

#include <vector>

namespace reanimated::css {

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_IOS = {
    {"fontVariant",
     value<CSSDiscreteArray<CSSKeyword>>(std::vector<CSSKeyword>{})},
    {"textDecorationColor", value<CSSColor>(BLACK)},
    {"textDecorationStyle", value<CSSKeyword>("solid")},
    {"writingDirection", value<CSSKeyword>("auto")},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_ANDROID = {
    {"textAlignVertical", value<CSSKeyword>("auto")},
    {"verticalAlign", value<CSSKeyword>("auto")},
    {"includeFontPadding", value<CSSBoolean>(false)},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS = mergeInterpolators(
    VIEW_INTERPOLATORS,
    TEXT_INTERPOLATORS_IOS,
    TEXT_INTERPOLATORS_ANDROID,
    InterpolatorFactoriesRecord{
        {"color", value<CSSColor>(BLACK)},
        {"fontFamily", value<CSSKeyword>("inherit")},
        {"fontSize", value<CSSDouble>(14)},
        {"fontStyle", value<CSSKeyword>("normal")},
        {"fontWeight", value<CSSKeyword>("normal")},
        {"letterSpacing", value<CSSDouble>(0)},
        {"lineHeight",
         value<CSSDouble>(14)}, // TODO - should inherit from fontSize
        {"textAlign", value<CSSKeyword>("auto")},
        {"textDecorationLine", value<CSSKeyword>("none")},
        {"textShadowColor", value<CSSColor>(BLACK)},
        {"textShadowOffset",
         record(
             {{"width", value<CSSDouble>(0)},
              {"height", value<CSSDouble>(0)}})},
        {"textShadowRadius", value<CSSDouble>(0)},
        {"textTransform", value<CSSKeyword>("none")},
        {"userSelect", value<CSSKeyword>("auto")},
    });

} // namespace reanimated::css
