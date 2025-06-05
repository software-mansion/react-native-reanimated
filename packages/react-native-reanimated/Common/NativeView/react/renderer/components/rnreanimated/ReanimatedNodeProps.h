#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/propsConversions.h>

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>
#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

#include <folly/dynamic.h>
#include <memory>
#include <vector>

namespace facebook::react {

using namespace reanimated;
using namespace css;

// Custom overload for CSSAnimationConfig that pulls keyframesRegistry from the
// context in order to store and reuse animations with the same name
// (node_modules/react-native/ReactCommon/react/renderer/core/propsConversions.h)
void fromRawValue(
    const PropsParserContext &context,
    const RawValue &rawValue,
    CSSAnimationConfig &result) {
  const auto &proxy =
      context.contextContainer.at<std::weak_ptr<ReanimatedModuleProxy>>(
          "ReanimatedModuleProxy");
  const auto &sharedProxy = proxy.lock();
  const auto &keyframesRegistry =
      sharedProxy->getCssAnimationKeyframesRegistry();

  parseRawValue(rawValue, [](jsi::Runtime &rt, const jsi::Value &value) {
    //    LOG(INFO) << stringifyJSIValue(rt, value);
  });

  result = CSSAnimationConfig(keyframesRegistry, rawValue);
}

class ReanimatedNodeProps final : public ViewProps {
 public:
  ReanimatedNodeProps() = default;
  ReanimatedNodeProps(
      const PropsParserContext &context,
      const ReanimatedNodeProps &sourceProps,
      const RawProps &rawProps);

#pragma mark - Props

  folly::dynamic jsStyle{};
  std::optional<CSSTransitionConfig> cssTransition{};
  std::vector<CSSAnimationConfig> cssAnimations{};
};

} // namespace facebook::react
