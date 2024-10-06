#include <reanimated/CSS/util/props.h>

namespace reanimated {

std::vector<std::string> getChangedProps(
    const jsi::Runtime &rt,
    const std::vector<std::string> propertyNames,
    const jsi::Value &oldProps,
    const jsi::Value &newProps) {
  return propertyNames;
}

} // namespace reanimated
