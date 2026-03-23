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
 * JScriptBufferWrapper is a JNI wrapper class that holds a ScriptBuffer containing 
 * JavaScript code and its source URL, to be evaluated on a WorkletRuntime.
 */
class JScriptBufferWrapper : public jni::HybridClass<JScriptBufferWrapper> {
 public:
  constexpr static const char *const kJavaDescriptor = "Lcom/swmansion/worklets/ScriptBufferWrapper;";

  static void registerNatives();

  [[nodiscard]] std::shared_ptr<const ScriptBuffer> getScript() const;
  [[nodiscard]] std::string getSourceUrl() const;

 private:
  static jni::local_ref<JScriptBufferWrapper::jhybriddata> initHybridFromAssets(
      jni::alias_ref<jhybridobject> jThis,
      jni::alias_ref<JAssetManager::javaobject> assetManager,
      const std::string &assetURL);
  static jni::local_ref<JScriptBufferWrapper::jhybriddata> initHybridFromFile(
      jni::alias_ref<jhybridobject> jThis,
      const std::string &fileName);
  static jni::local_ref<JScriptBufferWrapper::jhybriddata>
  initHybridFromString(jni::alias_ref<jhybridobject> jThis, const std::string &script, const std::string &sourceURL);

  friend HybridBase;

  explicit JScriptBufferWrapper(const std::shared_ptr<const ScriptBuffer> &script, const std::string &sourceUrl);

  const std::shared_ptr<const ScriptBuffer> script_;
  const std::string sourceUrl_;
};

} // namespace worklets
