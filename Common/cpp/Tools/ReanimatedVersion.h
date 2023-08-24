#pragma once

#include <jsi/jsi.h>
#include <string>

using namespace facebook;

namespace reanimated {

jsi::String getReanimatedVersionString(jsi::Runtime &rt);

};
