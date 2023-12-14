#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include "JSLogger.h"

using namespace facebook;

namespace reanimated {

std::string getReanimatedCppVersion();

void injectReanimatedVersion(jsi::Runtime &);

bool matchVersion(const std::string &, const std::string &) {
  return true;
}
void checkJSVersion(jsi::Runtime &, const std::shared_ptr<JSLogger> &) {
  // NOOP
}

}; // namespace reanimated
