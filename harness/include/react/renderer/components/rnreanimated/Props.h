#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

class REASharedTransitionBoundaryProps final : public ViewProps {
 public:
  REASharedTransitionBoundaryProps() = default;
  REASharedTransitionBoundaryProps(
      const PropsParserContext &context,
      const REASharedTransitionBoundaryProps &sourceProps,
      const RawProps &rawProps)
      : ViewProps(context, sourceProps, rawProps),
        isActive(convertRawProp(context, rawProps, "isActive", sourceProps.isActive, false)) {}

  bool isActive{false};

#ifdef RN_SERIALIZABLE_STATE
  ComponentName getDiffPropsImplementationTarget() const override {
    return "REASharedTransitionBoundary";
  }

  folly::dynamic getDiffProps(const Props *previousProps) const override {
    auto result = ViewProps::getDiffProps(previousProps);
    static const auto defaultProps = REASharedTransitionBoundaryProps{};
    auto previous =
        previousProps == nullptr ? &defaultProps : static_cast<const REASharedTransitionBoundaryProps *>(previousProps);
    if (isActive != previous->isActive) {
      result["isActive"] = isActive;
    }
    return result;
  }
#endif
};

} // namespace facebook::react
