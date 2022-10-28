#include "LayoutAnimations.h"
#include "FeaturesConfig.h"
#include "Logger.h"

namespace reanimated {

LayoutAnimations::LayoutAnimations(
    jni::alias_ref<LayoutAnimations::javaobject> jThis)
    : javaPart_(jni::make_global(jThis)) {}

jni::local_ref<LayoutAnimations::jhybriddata> LayoutAnimations::initHybrid(
    jni::alias_ref<jhybridobject> jThis) {
  return makeCxxInstance(jThis);
}

void LayoutAnimations::setWeakUIRuntime(std::weak_ptr<jsi::Runtime> wrt) {
  this->weakUIRuntime = wrt;
}

void LayoutAnimations::setAnimationStartingBlock(
    AnimationStartingBlock animationStartingBlock) {
  this->_animationStartingBlock = animationStartingBlock;
}

void LayoutAnimations::startAnimationForTag(
    int tag,
    alias_ref<JString> type,
    alias_ref<JMap<jstring, jstring>> values) {
  this->_animationStartingBlock(tag, type, values);
}

void LayoutAnimations::progressLayoutAnimation(
    int tag,
    const jsi::Value &progress) {
  if (auto rt = this->weakUIRuntime.lock()) {
    static const auto method =
        javaPart_->getClass()
            ->getMethod<void(int, JMap<JString, JObject>::javaobject)>(
                "progressLayoutAnimation");
    method(
        javaPart_.get(),
        tag,
        JNIHelper::ConvertToPropsMap(*rt, progress.asObject(*rt)).get());
  }
}

void LayoutAnimations::endLayoutAnimation(
    int tag,
    bool cancelled,
    std::string type) {
  static const auto method =
      javaPart_->getClass()->getMethod<void(int, bool, std::string)>(
          "endLayoutAnimation");
  method(javaPart_.get(), tag, cancelled, type);
}

void LayoutAnimations::setHasAnimationBlock(
    HasAnimationBlock hasAnimationBlock) {
  this->_hasAnimationBlock = hasAnimationBlock;
}

bool LayoutAnimations::hasAnimationForTag(int tag, std::string type) {
  return _hasAnimationBlock(tag, type);
}

bool LayoutAnimations::isLayoutAnimationEnabled() {
  return FeaturesConfig::isLayoutAnimationEnabled();
}

void LayoutAnimations::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", LayoutAnimations::initHybrid),
      makeNativeMethod(
          "startAnimationForTag", LayoutAnimations::startAnimationForTag),
      makeNativeMethod(
          "hasAnimationForTag", LayoutAnimations::hasAnimationForTag),
      makeNativeMethod(
          "isLayoutAnimationEnabled",
          LayoutAnimations::isLayoutAnimationEnabled),
  });
}

}; // namespace reanimated
