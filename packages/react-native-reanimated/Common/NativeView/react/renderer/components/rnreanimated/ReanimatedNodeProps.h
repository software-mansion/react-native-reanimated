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

 private:
  std::optional<CSSTransitionConfig> parseCSSTransition(
      const RawProps &rawProps);

  std::vector<CSSAnimationConfig> parseCSSAnimations(const RawProps &rawProps);

  template <typename T>
  std::optional<T> parseRawProp(
      const RawProps &rawProps,
      const char *propName,
      std::function<T(jsi::Runtime &, const jsi::Value &)> parser);
};

} // namespace facebook::react
