#include <string>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <worklets/NativeModules/NativeWorkletsModule.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <jsi/jsi.h>

using namespace facebook;

namespace worklets {

NativeWorkletsModule::NativeWorkletsModule(const std::string &valueUnpackerCode)
    : NativeWorkletsModuleSpec(nullptr),
      valueUnpackerCode_(valueUnpackerCode) {}

NativeWorkletsModule::~NativeWorkletsModule() {}
} // namespace worklets
