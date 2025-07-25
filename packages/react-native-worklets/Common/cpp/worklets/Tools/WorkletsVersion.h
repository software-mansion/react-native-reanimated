#pragma once

#include <worklets/Tools/JSLogger.h>

#include <jsi/jsi.h>

#include <memory>
#include <string>

using namespace facebook;

namespace worklets {

std::string getWorkletsCppVersion();
void injectWorkletsCppVersion(jsi::Runtime &);
void checkJSVersion(
    jsi::Runtime &,
    const std::shared_ptr<worklets::JSLogger> &);

}; // namespace worklets
