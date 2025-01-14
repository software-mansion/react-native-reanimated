#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/common/values/CSSAngle.h>

namespace reanimated {

CSSAngle::CSSAngle() : value(0) {}

CSSAngle::CSSAngle(const double value) : value(value) {}

CSSAngle::CSSAngle(const std::string &rotationString) {
  static const std::regex validNumberRegex(R"(^[-+]?\d*\.?\d+$)");
  static const std::unordered_map<std::string, double> unitFactors = {
      {"rad", 1},
      {"deg", M_PI / 180},
  };

  size_t pos = rotationString.find_first_not_of("0123456789.-+");

  if (pos == std::string::npos) {
    throw std::invalid_argument(
        "[Reanimated] CSSAngle: Invalid angle value: " + rotationString);
  }

  std::string numericPart = rotationString.substr(0, pos);
  std::string unitPart = rotationString.substr(pos);

  if (!std::regex_match(numericPart, validNumberRegex)) {
    throw std::invalid_argument(
        "[Reanimated] CSSAngle: Invalid angle value: " + rotationString);
  }

  // Lookup the unit and convert to radians
  auto it = unitFactors.find(unitPart);
  if (it == unitFactors.cend()) {
    throw std::invalid_argument(
        "[Reanimated] CSSAngle: Invalid angle unit: " + unitPart);
  }

  double numericValue = std::stod(numericPart);

  this->value = numericValue * it->second;
}

CSSAngle::CSSAngle(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (!jsiValue.isString()) {
    throw std::invalid_argument(
        "[Reanimated] CSSAngle: Invalid value type: " +
        stringifyJSIValue(rt, jsiValue));
  }

  std::string strValue = jsiValue.asString(rt).utf8(rt);
  *this = CSSAngle(strValue);
}

bool CSSAngle::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  // TODO - improve canConstruct check and add check for string correctness
  return jsiValue.isString();
}

jsi::Value CSSAngle::toJSIValue(jsi::Runtime &rt) const {
  return jsi::String::createFromUtf8(rt, toString());
}

folly::dynamic CSSAngle::toDynamic() const {
  return folly::dynamic(toString());
}

std::string CSSAngle::toString() const {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(4) << value;
  return stream.str() + "rad";
}

CSSAngle CSSAngle::interpolate(double progress, const CSSAngle &to) const {
  return CSSAngle(value + (to.value - value) * progress);
}

bool CSSAngle::operator==(const CSSAngle &other) const {
  return value == other.value;
}

std::ostream &operator<<(std::ostream &os, const CSSAngle &angleValue) {
  os << "CSSAngle(" << angleValue.value << ")";
  return os;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
