#pragma once

#include <jsi/jsi.h>
#include <string>
#include "Macros.h"

using namespace facebook;

namespace reanimated {

std::string getReanimatedCppVersion();

#ifndef REANIMATED_NDEBUG
bool matchVersion(const std::string &, const std::string &);
void checkJSVersion(jsi::Runtime &);
#endif // REANIMATED_NDEBUG

}; // namespace reanimated
