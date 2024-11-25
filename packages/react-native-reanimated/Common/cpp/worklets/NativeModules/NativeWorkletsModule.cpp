#include <string>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <worklets/NativeModules/NativeWorkletsModule.h>
#include <worklets/SharedItems/Shareables.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <jsi/jsi.h>

using namespace facebook;

namespace worklets {

NativeWorkletsModule::NativeWorkletsModule(
    const std::string &valueUnpackerCode,
    const std::shared_ptr<MessageQueueThread> &jsQueue)
    : NativeWorkletsModuleSpec(nullptr),
      valueUnpackerCode_(valueUnpackerCode),
      jsQueue_(jsQueue) {}

NativeWorkletsModule::~NativeWorkletsModule() {}

jsi::Value NativeWorkletsModule::makeShareableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  // TODO: It might be a good idea to rename one of these methods to avoid
  // confusion.
  return worklets::makeShareableClone(
      rt, value, shouldRetainRemote, nativeStateSource);
}

} // namespace worklets
