#pragma once

#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/common/definitions.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

bool isDiscreteProperty(const std::string &propName, const std::string &componentName);

} // namespace reanimated::css
