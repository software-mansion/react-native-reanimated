#pragma once

#include <worklets/Tools/JSLogger.h>

#include <jsi/jsi.h>
#include <memory>
#include <regex>
#include <string>

using namespace facebook;

namespace worklets {

bool matchVersion(const std::string &version1, const std::string &version2);

void checkJSVersion(
    jsi::Runtime &runtime,
    jsi::Value &jsVersionValue,
    const std::shared_ptr<worklets::JSLogger> &jsLogger,
    const std::string &cppVersion,
    const std::string &libraryName,
    const std::string &docsBaseUrl);

}; // namespace worklets
