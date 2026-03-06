#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/ScriptBuffer.h>

namespace worklets {

struct BundleModeConfig {
  bool enabled;
  std::string bundleURL;
  std::shared_ptr<const ScriptBuffer> bundleScript;
};

} // namespace worklets
