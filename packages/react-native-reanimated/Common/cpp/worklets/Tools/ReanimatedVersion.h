#pragma once

#include <worklets/Tools/JSLogger.h>

#include <jsi/jsi.h>

#include <memory>
#include <string>

namespace worklets {

std::string getReanimatedCppVersion();
void injectReanimatedCppVersion(facebook::jsi::Runtime &);
bool matchVersion(const std::string &, const std::string &);
void checkJSVersion(
    facebook::jsi::Runtime &,
    const std::shared_ptr<JSLogger> &);

}; // namespace worklets
