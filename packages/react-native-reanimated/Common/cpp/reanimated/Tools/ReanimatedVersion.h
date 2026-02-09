#pragma once

#include <jsi/jsi.h>

#include <string>

using namespace facebook;

namespace reanimated {

std::string getReanimatedCppVersion();
void injectReanimatedCppVersion(jsi::Runtime &rt);
void checkJSVersion(jsi::Runtime &rt);

}; // namespace reanimated
