#pragma once

#include <worklets/Tools/JSLogger.h>

#include <jsi/jsi.h>

#include <memory>
#include <string>

using namespace facebook;

namespace reanimated {

std::string getReanimatedCppVersion();
void injectReanimatedCppVersion(jsi::Runtime &);
void checkJSVersion(
    jsi::Runtime &,
    const std::shared_ptr<worklets::JSLogger> &);

}; // namespace reanimated
