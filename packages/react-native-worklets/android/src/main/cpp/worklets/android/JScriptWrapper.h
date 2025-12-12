#pragma once

#include <fbjni/fbjni.h>
#include <jsireact/JSIExecutor.h>
#include <react/jni/JSLoader.h>
#include <worklets/Tools/ScriptBuffer.h>

#include <memory>
#include <string>

namespace worklets {

using namespace facebook;
using namespace facebook::react;

/**
    * A JNI wrapper around a ScriptBuffer that holds the JavaScript code to be
    * evaluated in a WorkletRuntime.
 */
class JScriptWrapper : public jni::HybridClass<JScriptWrapper> {
 public:
  constexpr static const char *const kJavaDescriptor = "Lcom/swmansion/worklets/ScriptWrapper;";

  static void registerNatives();

  [[nodiscard]] std::shared_ptr<const ScriptBuffer> getScript() const;
  [[nodiscard]] std::string getSourceUrl() const;

 private:
  static jni::local_ref<JScriptWrapper::jhybriddata> initHybridFromAssets(
      jni::alias_ref<jhybridobject> jThis,
      jni::alias_ref<JAssetManager::javaobject> assetManager,
      const std::string &assetURL);
  static jni::local_ref<JScriptWrapper::jhybriddata> initHybridFromFile(
      jni::alias_ref<jhybridobject> jThis,
      const std::string &fileName);
  static jni::local_ref<JScriptWrapper::jhybriddata>
  initHybridFromString(jni::alias_ref<jhybridobject> jThis, const std::string &script, const std::string &sourceURL);

  friend HybridBase;

  explicit JScriptWrapper(const std::shared_ptr<const ScriptBuffer> &script, const std::string &sourceUrl);

  const std::shared_ptr<const ScriptBuffer> script_;
  const std::string sourceUrl_;
};

} // namespace worklets
