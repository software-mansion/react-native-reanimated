#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/common/UnitValue.h>

namespace reanimated {

UnitValue::UnitValue() : value(0), isRelative(false) {}

UnitValue::UnitValue(const double value) : value(value), isRelative(false) {}

UnitValue::UnitValue(const double value, const bool isRelative)
    : value(value), isRelative(isRelative) {}

UnitValue::UnitValue(const std::string &value) {
  std::string str = value;
  if (str.back() == '%') {
    str.pop_back();
    this->value = std::stod(str) / 100;
    this->isRelative = true;
  } else {
    throw std::runtime_error(
        "[Reanimated] UnitValue: unsupported value: " + str);
  }
}

UnitValue::UnitValue(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isNumber()) {
    this->value = value.asNumber();
    this->isRelative = false;
  } else if (value.isString()) {
    std::string strValue = value.asString(rt).utf8(rt);
    *this = UnitValue(strValue); // Delegate to the string constructor
  } else {
    throw std::runtime_error("[Reanimated] UnitValue: unsupported value type");
  }
}

jsi::Value UnitValue::toJSIValue(jsi::Runtime &rt) const {
  if (isRelative) {
    return jsi::String::createFromUtf8(rt, std::to_string(value * 100) + "%");
  } else {
    return {value};
  }
}

UnitValue UnitValue::interpolate(
    const double progress,
    const UnitValue &to,
    const UnitValueInterpolationContext &context) const {
  // If both value types are the same, we can interpolate without reading the
  // relative value from the shadow node
  // (also, when one of the values is 0, and the other is relative)
  if ((isRelative == to.isRelative) || (isRelative && to.value == 0) ||
      (to.isRelative && value == 0)) {
    return UnitValue(
        value + (to.value - value) * progress, isRelative || to.isRelative);
  }
  // Otherwise, we need to read the relative value from the shadow node and
  // interpolate values as numbers
  const auto resolvedFrom = resolve(context);
  const auto resolvedTo = to.resolve(context);

  if (!resolvedFrom.has_value() || !resolvedTo.has_value()) {
    return progress < 0.5 ? *this : to;
  }
  return UnitValue(
      resolvedFrom.value() +
      (resolvedTo.value() - resolvedFrom.value()) * progress);
}

std::optional<double> UnitValue::resolve(
    const UnitValueInterpolationContext &context) const {
  if (!isRelative) {
    return value;
  }

  jsi::Value relativeValue;
  if (context.relativeTo == RelativeTo::SELF) {
    relativeValue = context.viewStylesRepository->getNodeProp(
        context.node, context.relativeProperty);
  } else {
    relativeValue = context.viewStylesRepository->getParentNodeProp(
        context.node, context.relativeProperty);
  }

  if (!relativeValue.isNumber()) {
    return std::nullopt;
  }

  return value * relativeValue.getNumber();
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
