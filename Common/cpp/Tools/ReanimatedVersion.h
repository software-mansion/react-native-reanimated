#pragma once

#include <jsi/jsi.h>
#include <string>
#include "ReanimatedMacros.h"

using namespace facebook;

namespace reanimated {

std::string getReanimatedCppVersion();

#ifndef DEBUG
bool matchVersion(const std::string &, const std::string &);
void checkJSVersion(jsi::Runtime &);
#endif // REANIMATED_NDEBUG

}; // namespace reanimated
