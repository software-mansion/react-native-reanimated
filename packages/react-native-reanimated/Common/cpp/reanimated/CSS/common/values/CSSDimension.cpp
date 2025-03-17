#include <reanimated/CSS/common/values/CSSDimension.h>

namespace reanimated::css {

CSSDimension::CSSDimension() : value(0), isRelative(false) {}

CSSDimension::CSSDimension(const double value)
    : value(value), isRelative(false) {}

CSSDimension::CSSDimension(const double value, const bool isRelative)
    : value(value), isRelative(isRelative) {}

CSSDimension::CSSDimension(const char *value) {
  if (!canConstruct(value)) {
    throw std::invalid_argument(
        "[Reanimated] CSSDimension: Invalid value: " + std::string(value));
  }

  std::string str = value;
  str.pop_back();
  this->value = std::stod(str) / 100;
  this->isRelative = true;
}

CSSDimension::CSSDimension(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (jsiValue.isNumber()) {
    this->value = jsiValue.asNumber();
    this->isRelative = false;
  } else if (jsiValue.isString()) {
    std::string strValue = jsiValue.asString(rt).utf8(rt);
    *this = CSSDimension(strValue); // Delegate to the string constructor
  } else {
    throw std::runtime_error(
        "[Reanimated] CSSDimension: Unsupported value type");
  }
}

CSSDimension::CSSDimension(const folly::dynamic &value) {
  if (value.isNumber()) {
    this->value = value.getDouble();
    this->isRelative = false;
  } else if (value.isString()) {
    std::string strValue = value.getString();
    *this =
        CSSDimension(strValue.c_str()); // Delegate to the string constructor
  } else {
    throw std::runtime_error(
        "[Reanimated] CSSDimension: Unsupported value type");
  }
}

bool CSSDimension::canConstruct(const std::string &value) {
  return !value.empty() && value.back() == '%';
}

bool CSSDimension::canConstruct(const char *value) {
  auto str = std::string(value);
  return !str.empty() && str.back() == '%';
}

bool CSSDimension::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return jsiValue.isNumber() ||
      (jsiValue.isString() && canConstruct(jsiValue.getString(rt).utf8(rt)));
}

bool CSSDimension::canConstruct(const folly::dynamic &value) {
  return value.isNumber() ||
      (value.isString() && canConstruct(value.getString()));
}

folly::dynamic CSSDimension::toDynamic() const {
  if (isRelative) {
    return std::to_string(value * 100) + "%";
  }
  return value;
}

std::string CSSDimension::toString() const {
  if (isRelative) {
    return std::to_string(value * 100) + "%";
  }
  return std::to_string(value);
}

CSSDimension CSSDimension::interpolate(
    const double progress,
    const CSSDimension &to,
    const CSSResolvableValueInterpolationContext &context) const {
  // If both value types are the same, we can interpolate without reading the
  // relative value from the shadow node
  // (also, when one of the values is 0, and the other is relative)
  if ((isRelative == to.isRelative) || (isRelative && to.value == 0) ||
      (to.isRelative && value == 0)) {
    return CSSDimension(
        value + (to.value - value) * progress, isRelative || to.isRelative);
  }
  // Otherwise, we need to read the relative value from the shadow node and
  // interpolate values as numbers
  const auto resolvedFrom = resolve(context);
  const auto resolvedTo = to.resolve(context);

  if (!resolvedFrom.has_value() || !resolvedTo.has_value()) {
    return progress < 0.5 ? *this : to;
  }
  return CSSDimension(
      resolvedFrom.value() +
      (resolvedTo.value() - resolvedFrom.value()) * progress);
}

std::optional<double> CSSDimension::resolve(
    const CSSResolvableValueInterpolationContext &context) const {
  if (!isRelative) {
    return value;
  }

  jsi::Value relativeValue;
  if (context.relativeTo == RelativeTo::Self) {
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

bool CSSDimension::operator==(const CSSDimension &other) const {
  return value == other.value && isRelative == other.isRelative;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSDimension &dimension) {
  os << "CSSDimension(" << dimension.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
