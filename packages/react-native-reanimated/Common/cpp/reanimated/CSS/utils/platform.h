#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>

#include <array>
#include <string>
#include <variant>

namespace reanimated::css {

using namespace facebook;

using PlatformValue = std::variant<std::monostate, double, std::array<double, 2>, std::array<double, 4>>;

PlatformValue parsePlatformValue(jsi::Runtime &rt, const std::string &propertyName, const jsi::Value &value);
/** TODO: unify folly::dynamic and jsi::value versions */
PlatformValue parsePlatformValue(const std::string &propertyName, const folly::dynamic &value);

} // namespace reanimated::css
