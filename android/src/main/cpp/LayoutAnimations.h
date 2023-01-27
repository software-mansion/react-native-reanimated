#pragma once

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include "JNIHelper.h"

namespace reanimated {

using namespace facebook::jni;
using namespace facebook;

class LayoutAnimations : public jni::HybridClass<LayoutAnimations> {
  using AnimationStartingBlock = std::function<
      void(int, alias_ref<JString>, alias_ref<JMap<jstring, jstring>>)>;
  using HasAnimationBlock = std::function<bool(int, const std::string &)>;
  using ClearAnimationConfigBlock = std::function<void(int)>;

 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/layoutReanimation/LayoutAnimations;";
  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();

  void startAnimationForTag(
      int tag,
      alias_ref<JString> type,
      alias_ref<JMap<jstring, jstring>> values);
  bool hasAnimationForTag(int tag, std::string type);
  bool isLayoutAnimationEnabled();

  void setAnimationStartingBlock(AnimationStartingBlock animationStartingBlock);
  void setHasAnimationBlock(HasAnimationBlock hasAnimationBlock);
  void setClearAnimationConfigBlock(
      ClearAnimationConfigBlock clearAnimationConfigBlock);

  void progressLayoutAnimation(
      int tag,
      const jni::local_ref<JNIHelper::PropsMap> &updates);
  void endLayoutAnimation(int tag, bool cancelled, bool removeView);
  void clearAnimationConfigForTag(int tag);

 private:
  friend HybridBase;
  jni::global_ref<LayoutAnimations::javaobject> javaPart_;
  AnimationStartingBlock animationStartingBlock_;
  HasAnimationBlock hasAnimationBlock_;
  ClearAnimationConfigBlock clearAnimationConfigBlock_;

  explicit LayoutAnimations(
      jni::alias_ref<LayoutAnimations::jhybridobject> jThis);
};

}; // namespace reanimated
