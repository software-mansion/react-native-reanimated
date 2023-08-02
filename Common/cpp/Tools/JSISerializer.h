#pragma once

#include <jsi/jsi.h>
#include <string>

using namespace facebook;

namespace reanimated {

std::string stringifyJSIValue(jsi::Runtime &rt, const jsi::Value &value);

} // namespace reanimated
