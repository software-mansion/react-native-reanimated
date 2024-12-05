#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <worklets/Tools/JSISerializer.h>

#include <jsi/jsi.h>
#include <iomanip>
#include <regex>
#include <sstream>
#include <string>
#include <unordered_map>

namespace reanimated {

using namespace facebook;
using namespace worklets;

struct AngleValue {
  double value;

  AngleValue();
  explicit AngleValue(double value);
  explicit AngleValue(const std::string &rotationString);
  explicit AngleValue(jsi::Runtime &rt, const jsi::Value &value);

  bool operator==(const AngleValue &other) const;
  friend std::ostream &operator<<(
      std::ostream &os,
      const AngleValue &angleValue);

  std::string toString() const;
  jsi::Value toJSIValue(jsi::Runtime &rt) const;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
