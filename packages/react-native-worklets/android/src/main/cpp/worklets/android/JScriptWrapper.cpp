/**
 * Based on
 * https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/src/main/jni/react/jni/JSLoader.cpp
 */

#include <cxxreact/JSBigString.h>
#include <cxxreact/RecoverableError.h>
#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/android/JScriptWrapper.h>

#include <utility>

namespace worklets {

using namespace facebook::jni;

jni::local_ref<JScriptWrapper::jhybriddata> JScriptWrapper::initHybridFromAssets(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jni::alias_ref<JAssetManager::javaobject> assetManager, // NOLINT //(performance-unnecessary-value-param)
    const std::string &sourceURL) {
  auto manager = extractAssetManager(assetManager);
  auto bigString = loadScriptFromAssets(manager, sourceURL);
  auto script = std::make_shared<ScriptBuffer>(std::move(bigString));
  return makeCxxInstance(std::move(script), sourceURL);
}

jni::local_ref<JScriptWrapper::jhybriddata> JScriptWrapper::initHybridFromFile(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    const std::string &fileName) {
  std::shared_ptr<const ScriptBuffer> script;
  RecoverableError::runRethrowingAsRecoverable<std::system_error>([&fileName, &script]() {
    auto bigString = JSBigFileString::fromPath(fileName);
    script = std::make_shared<ScriptBuffer>(std::move(bigString));
  });
  return makeCxxInstance(std::move(script), fileName);
}

jni::local_ref<JScriptWrapper::jhybriddata> JScriptWrapper::initHybridFromString(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    const std::string &scriptStr,
    const std::string &sourceURL) {
  auto bigString = std::make_shared<JSBigStdString>(scriptStr);
  auto script = std::make_shared<ScriptBuffer>(std::move(bigString));
  return makeCxxInstance(std::move(script), sourceURL);
}

JScriptWrapper::JScriptWrapper(const std::shared_ptr<const ScriptBuffer> &script, const std::string &sourceUrl)
    : script_(script), sourceUrl_(sourceUrl) {}

std::shared_ptr<const ScriptBuffer> JScriptWrapper::getScript() const {
  return script_;
}

std::string JScriptWrapper::getSourceUrl() const {
  return sourceUrl_;
}

void JScriptWrapper::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybridFromAssets", JScriptWrapper::initHybridFromAssets),
      makeNativeMethod("initHybridFromFile", JScriptWrapper::initHybridFromFile),
      makeNativeMethod("initHybridFromString", JScriptWrapper::initHybridFromString),
  });
}
} // namespace worklets
