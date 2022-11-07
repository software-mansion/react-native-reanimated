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
  this->animationStartingBlock_ = animationStartingBlock;
}

void LayoutAnimations::startAnimationForTag(
    int tag,
    alias_ref<JString> type,
    alias_ref<JMap<jstring, jstring>> values) {
  this->animationStartingBlock_(tag, type, values);
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
    bool removeView) {
  static const auto method =
      javaPart_->getClass()->getMethod<void(int, bool, bool)>(
          "endLayoutAnimation");
  method(javaPart_.get(), tag, cancelled, removeView);
}

void LayoutAnimations::setHasAnimationBlock(
    HasAnimationBlock hasAnimationBlock) {
  this->hasAnimationBlock_ = hasAnimationBlock;
}

bool LayoutAnimations::hasAnimationForTag(int tag, std::string type) {
  return hasAnimationBlock_(tag, type);
}

void LayoutAnimations::setClearAnimationConfigBlock(
    ClearAnimationConfigBlock clearAnimationConfigBlock) {
  this->clearAnimationConfigBlock_ = clearAnimationConfigBlock;
}

void LayoutAnimations::clearAnimationConfigForTag(int tag) {
  clearAnimationConfigBlock_(tag);
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
          "clearAnimationConfigForTag",
          LayoutAnimations::clearAnimationConfigForTag),
      makeNativeMethod(
          "isLayoutAnimationEnabled",
          LayoutAnimations::isLayoutAnimationEnabled),
  });
}

}; // namespace reanimated
