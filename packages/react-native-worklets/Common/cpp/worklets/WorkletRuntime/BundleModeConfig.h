#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/ScriptBuffer.h>

#include <memory>
#include <string>

namespace worklets {

struct BundleModeConfig {
  bool enabled;
  std::shared_ptr<const ScriptBuffer> script;
  std::string sourceURL;
};

} // namespace worklets
