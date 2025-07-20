#pragma once

#include <jsi/jsi.h>

namespace worklets {
  typedef std::function<void(jsi::Runtime &rt, const jsi::Value &data, const jsi::Value& callback)> forwardedFetch;
}
