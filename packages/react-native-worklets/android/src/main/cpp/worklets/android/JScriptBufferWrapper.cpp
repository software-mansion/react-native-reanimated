/**
 * Based on
 * https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/src/main/jni/react/jni/JSLoader.cpp
 */

#include <cxxreact/JSBigString.h>
#include <cxxreact/RecoverableError.h>
#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/android/JScriptBufferWrapper.h>

#include <utility>

namespace worklets {

using namespace facebook::jni;

jni::local_ref<JScriptBufferWrapper::jhybriddata> JScriptBufferWrapper::initHybridFromAssets(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    jni::alias_ref<JAssetManager::javaobject> assetManager, // NOLINT //(performance-unnecessary-value-param)
    const std::string &sourceURL) {
  auto manager = extractAssetManager(assetManager);
  auto bigString = loadScriptFromAssets(manager, sourceURL);
  auto script = std::make_shared<ScriptBuffer>(std::move(bigString));
  return makeCxxInstance(std::move(script), sourceURL);
}

jni::local_ref<JScriptBufferWrapper::jhybriddata> JScriptBufferWrapper::initHybridFromFile(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    const std::string &fileName) {
  std::shared_ptr<const ScriptBuffer> script;
  RecoverableError::runRethrowingAsRecoverable<std::system_error>([&fileName, &script]() {
    auto bigString = JSBigFileString::fromPath(fileName);
    script = std::make_shared<ScriptBuffer>(std::move(bigString));
  });
  return makeCxxInstance(std::move(script), fileName);
}

jni::local_ref<JScriptBufferWrapper::jhybriddata> JScriptBufferWrapper::initHybridFromString(
    jni::alias_ref<jhybridobject> jThis, // NOLINT //(performance-unnecessary-value-param)
    const std::string &scriptStr,
    const std::string &sourceURL) {
  auto bigString = std::make_shared<JSBigStdString>(scriptStr);
  auto script = std::make_shared<ScriptBuffer>(std::move(bigString));
  return makeCxxInstance(std::move(script), sourceURL);
}

JScriptBufferWrapper::JScriptBufferWrapper(
    const std::shared_ptr<const ScriptBuffer> &script,
    const std::string &sourceUrl)
    : script_(script), sourceUrl_(sourceUrl) {}

std::shared_ptr<const ScriptBuffer> JScriptBufferWrapper::getScript() const {
  return script_;
}

std::string JScriptBufferWrapper::getSourceUrl() const {
  return sourceUrl_;
}

void JScriptBufferWrapper::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybridFromAssets", JScriptBufferWrapper::initHybridFromAssets),
      makeNativeMethod("initHybridFromFile", JScriptBufferWrapper::initHybridFromFile),
      makeNativeMethod("initHybridFromString", JScriptBufferWrapper::initHybridFromString),
  });
}
} // namespace worklets
