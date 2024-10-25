#include <reanimated/Tools/FeaturesConfig.h>
#include <reanimated/android/LayoutAnimations.h>

namespace reanimated {

LayoutAnimations::LayoutAnimations(
    facebook::jni::alias_ref<LayoutAnimations::javaobject> jThis)
    : javaPart_(facebook::jni::make_global(jThis)) {}

facebook::jni::local_ref<LayoutAnimations::jhybriddata>
LayoutAnimations::initHybrid(facebook::jni::alias_ref<jhybridobject> jThis) {
  return makeCxxInstance(jThis);
}

void LayoutAnimations::setAnimationStartingBlock(
    AnimationStartingBlock animationStartingBlock) {
  this->animationStartingBlock_ = animationStartingBlock;
}

void LayoutAnimations::startAnimationForTag(
    int tag,
    int type,
    facebook::jni::alias_ref<facebook::jni::JMap<jstring, jstring>> values) {
  this->animationStartingBlock_(tag, type, values);
}

void LayoutAnimations::progressLayoutAnimation(
    int tag,
    const facebook::jni::local_ref<JNIHelper::PropsMap> &updates,
    bool isSharedTransition) {
  static const auto method = javaPart_->getClass()
                                 ->getMethod<void(
                                     int,
                                     facebook::jni::JMap<
                                         facebook::jni::JString,
                                         facebook::jni::JObject>::javaobject,
                                     bool)>("progressLayoutAnimation");
  method(javaPart_.get(), tag, updates.get(), isSharedTransition);
}

void LayoutAnimations::endLayoutAnimation(int tag, bool removeView) {
  static const auto method =
      javaPart_->getClass()->getMethod<void(int, bool)>("endLayoutAnimation");
  method(javaPart_.get(), tag, removeView);
}

void LayoutAnimations::setHasAnimationBlock(
    HasAnimationBlock hasAnimationBlock) {
  this->hasAnimationBlock_ = hasAnimationBlock;
}

void LayoutAnimations::setShouldAnimateExitingBlock(
    ShouldAnimateExitingBlock shouldAnimateExitingBlock) {
  this->shouldAnimateExitingBlock_ = shouldAnimateExitingBlock;
}

#ifndef NDEBUG
void LayoutAnimations::setCheckDuplicateSharedTag(
    CheckDuplicateSharedTag checkDuplicateSharedTag) {
  checkDuplicateSharedTag_ = checkDuplicateSharedTag;
}

void LayoutAnimations::checkDuplicateSharedTag(int viewTag, int screenTag) {
  checkDuplicateSharedTag_(viewTag, screenTag);
}
#endif

bool LayoutAnimations::hasAnimationForTag(int tag, int type) {
  return hasAnimationBlock_(tag, type);
}

bool LayoutAnimations::shouldAnimateExiting(int tag, bool shouldAnimate) {
  return shouldAnimateExitingBlock_(tag, shouldAnimate);
}

void LayoutAnimations::setClearAnimationConfigBlock(
    ClearAnimationConfigBlock clearAnimationConfigBlock) {
  this->clearAnimationConfigBlock_ = clearAnimationConfigBlock;
}

void LayoutAnimations::clearAnimationConfigForTag(int tag) {
  clearAnimationConfigBlock_(tag);
}

void LayoutAnimations::setCancelAnimationForTag(
    CancelAnimationBlock cancelAnimationBlock) {
  this->cancelAnimationBlock_ = cancelAnimationBlock;
}

void LayoutAnimations::cancelAnimationForTag(int tag) {
  this->cancelAnimationBlock_(tag);
}

bool LayoutAnimations::isLayoutAnimationEnabled() {
  return FeaturesConfig::isLayoutAnimationEnabled();
}

void LayoutAnimations::setFindPrecedingViewTagForTransition(
    FindPrecedingViewTagForTransitionBlock
        findPrecedingViewTagForTransitionBlock) {
  findPrecedingViewTagForTransitionBlock_ =
      findPrecedingViewTagForTransitionBlock;
}

void LayoutAnimations::setGetSharedGroupBlock(
    GetSharedGroupBlock getSharedGroupBlock) {
  getSharedGroupBlock_ = getSharedGroupBlock;
}

int LayoutAnimations::findPrecedingViewTagForTransition(int tag) {
  return findPrecedingViewTagForTransitionBlock_(tag);
}

facebook::jni::local_ref<facebook::jni::JArrayInt>
LayoutAnimations::getSharedGroup(const int tag) {
  const auto &group = getSharedGroupBlock_(tag);
  auto jGroup = facebook::jni::JArrayInt::newArray(group.size());
  jGroup->setRegion(0, group.size(), group.data());
  return jGroup;
}

void LayoutAnimations::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", LayoutAnimations::initHybrid),
      makeNativeMethod(
          "startAnimationForTag", LayoutAnimations::startAnimationForTag),
      makeNativeMethod(
          "hasAnimationForTag", LayoutAnimations::hasAnimationForTag),
      makeNativeMethod(
          "shouldAnimateExiting", LayoutAnimations::shouldAnimateExiting),
      makeNativeMethod(
          "clearAnimationConfigForTag",
          LayoutAnimations::clearAnimationConfigForTag),
      makeNativeMethod(
          "cancelAnimationForTag", LayoutAnimations::cancelAnimationForTag),
      makeNativeMethod(
          "isLayoutAnimationEnabled",
          LayoutAnimations::isLayoutAnimationEnabled),
      makeNativeMethod(
          "findPrecedingViewTagForTransition",
          LayoutAnimations::findPrecedingViewTagForTransition),
      makeNativeMethod("getSharedGroup", LayoutAnimations::getSharedGroup),
#ifndef NDEBUG
      makeNativeMethod(
          "checkDuplicateSharedTag", LayoutAnimations::checkDuplicateSharedTag),
#endif
  });
}
}; // namespace reanimated
