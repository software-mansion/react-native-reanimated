#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/propsConversions.h>

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/config/CSSTransitionConfig.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class ReanimatedNodeProps final : public ViewProps {
 public:
  ReanimatedNodeProps() = default;
  ReanimatedNodeProps(
      const PropsParserContext &context,
      const ReanimatedNodeProps &sourceProps,
      const RawProps &rawProps);

#pragma mark - Props

  using JsiValuePair = std::pair<jsi::Runtime *, jsi::Value>;

  folly::dynamic jsStyle{};
  std::optional<CSSTransitionConfig> cssTransition{};
  std::vector<CSSAnimationConfig> cssAnimations{};
};

} // namespace facebook::react
