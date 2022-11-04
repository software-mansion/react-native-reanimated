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
  using HasAnimationBlock = std::function<bool(int, std::string)>;

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

  void setWeakUIRuntime(std::weak_ptr<jsi::Runtime> wrt);
  void setAnimationStartingBlock(AnimationStartingBlock animationStartingBlock);
  void setHasAnimationBlock(HasAnimationBlock hasAnimationBlock);

  void progressLayoutAnimation(int tag, const jsi::Value &progress);
  void endLayoutAnimation(int tag, bool cancelled, bool removeView);

 private:
  friend HybridBase;
  jni::global_ref<LayoutAnimations::javaobject> javaPart_;
  std::weak_ptr<jsi::Runtime> weakUIRuntime;
  AnimationStartingBlock animationStartingBlock_;
  HasAnimationBlock hasAnimationBlock_;

  explicit LayoutAnimations(
      jni::alias_ref<LayoutAnimations::jhybridobject> jThis);
};

}; // namespace reanimated
