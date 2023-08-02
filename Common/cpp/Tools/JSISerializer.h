#pragma once

#include <jsi/jsi.h>
#include <string>

using namespace facebook;

namespace reanimated {

std::string stringifyValue(jsi::Runtime &rt, const jsi::Value &value);

} // namespace reanimated
