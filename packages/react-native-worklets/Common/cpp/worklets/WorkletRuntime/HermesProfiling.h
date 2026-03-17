#pragma once

#include <jsi/jsi.h>

#include <string>

namespace worklets {

void startProfiling(facebook::jsi::Runtime &rt, double meanHzFreq);
std::string stopProfiling(facebook::jsi::Runtime &rt);

} // namespace worklets
