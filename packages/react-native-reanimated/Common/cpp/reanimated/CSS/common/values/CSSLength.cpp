#include <reanimated/CSS/common/values/CSSLength.h>

namespace reanimated::css {

CSSLength::CSSLength() : value(0), isRelative(false) {}

CSSLength::CSSLength(const double value) : value(value), isRelative(false) {}

CSSLength::CSSLength(const double value, const bool isRelative)
    : value(value), isRelative(isRelative) {}

CSSLength::CSSLength(const char *value) {
  if (!canConstruct(value)) {
    throw std::invalid_argument(
        "[Reanimated] CSSLength: Invalid value: " + std::string(value));
  }

  std::string str = value;
  str.pop_back();
  this->value = std::stod(str) / 100;
  this->isRelative = true;
}

CSSLength::CSSLength(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (jsiValue.isNumber()) {
    this->value = jsiValue.asNumber();
    this->isRelative = false;
  } else if (jsiValue.isString()) {
    std::string strValue = jsiValue.asString(rt).utf8(rt);
    *this = CSSLength(strValue); // Delegate to the string constructor
  } else {
    throw std::runtime_error("[Reanimated] CSSLength: Unsupported value type");
  }
}

CSSLength::CSSLength(const folly::dynamic &value) {
  if (value.isNumber()) {
    this->value = value.getDouble();
    this->isRelative = false;
  } else if (value.isString()) {
    std::string strValue = value.getString();
    *this = CSSLength(strValue.c_str()); // Delegate to the string constructor
  } else {
    throw std::runtime_error("[Reanimated] CSSLength: Unsupported value type");
  }
}

bool CSSLength::canConstruct(const std::string &value) {
  return !value.empty() && value.back() == '%';
}

bool CSSLength::canConstruct(const char *value) {
  return canConstruct(std::string(value));
}

bool CSSLength::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  return jsiValue.isNumber() ||
      (jsiValue.isString() && canConstruct(jsiValue.getString(rt).utf8(rt)));
}

bool CSSLength::canConstruct(const folly::dynamic &value) {
  return value.isNumber() ||
      (value.isString() && canConstruct(value.getString()));
}

folly::dynamic CSSLength::toDynamic() const {
  if (isRelative) {
    return std::to_string(value * 100) + "%";
  }
  return value;
}

std::string CSSLength::toString() const {
  if (isRelative) {
    return std::to_string(value * 100) + "%";
  }
  return std::to_string(value);
}

CSSLength CSSLength::interpolate(
    const double progress,
    const CSSLength &to,
    const CSSResolvableValueInterpolationContext &context) const {
  // If both value types are the same, we can interpolate without reading the
  // relative value from the shadow node
  // (also, when one of the values is 0, and the other is relative)
  if ((isRelative == to.isRelative) || (isRelative && to.value == 0) ||
      (to.isRelative && value == 0)) {
    return CSSLength(
        value + (to.value - value) * progress, isRelative || to.isRelative);
  }
  // Otherwise, we need to read the relative value from the shadow node and
  // interpolate values as numbers
  const auto resolvedFrom = resolve(context);
  const auto resolvedTo = to.resolve(context);

  if (!resolvedFrom.has_value() || !resolvedTo.has_value()) {
    return progress < 0.5 ? *this : to;
  }
  return CSSLength(
      resolvedFrom.value() +
      (resolvedTo.value() - resolvedFrom.value()) * progress);
}

std::optional<double> CSSLength::resolve(
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

bool CSSLength::operator==(const CSSLength &other) const {
  return value == other.value && isRelative == other.isRelative;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSLength &value) {
  os << "CSSLength(" << value.toString() << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
