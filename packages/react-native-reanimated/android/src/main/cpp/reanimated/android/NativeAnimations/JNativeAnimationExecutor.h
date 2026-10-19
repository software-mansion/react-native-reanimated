#pragma once

#include <reanimated/android/NativeAnimations/NativeAnimationPlatformCallbacks.h>

#include <fbjni/fbjni.h>

namespace reanimated::native_animation {

using namespace facebook::jni;

struct JView : JavaClass<JView> {
  static auto constexpr kJavaDescriptor = "Landroid/view/View;";
};

/// A `PreparedPlayback` or a `PreparationRejection`.
struct JPreparation : JavaClass<JPreparation> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/Preparation;";
};

struct JPreparedPlayback : JavaClass<JPreparedPlayback, JPreparation> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/PreparedPlayback;";

  void install(alias_ref<JArrayLong> replacedTracks) const {
    static const auto method = javaClassStatic()->getMethod<void(alias_ref<JArrayLong>)>("install");
    method(self(), replacedTracks);
  }
};

struct JPreparationRejection : JavaClass<JPreparationRejection, JPreparation> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/PreparationRejection;";

  jint reason() const {
    static const auto field = javaClassStatic()->getField<jint>("reason");
    return getFieldValue(field);
  }
};

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
struct JNativeAnimationSample : JavaClass<JNativeAnimationSample> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/NativeAnimationSample;";

  local_ref<JArrayDouble> doublesOf(const char *name) const {
    return getFieldValue(javaClassStatic()->getField<JArrayDouble::javaobject>(name));
  }

  local_ref<JArrayLong> playbacks() const {
    static const auto field = javaClassStatic()->getField<JArrayLong::javaobject>("playbacks");
    return getFieldValue(field);
  }

  local_ref<JString> memberProperty() const {
    static const auto field = javaClassStatic()->getField<JString::javaobject>("memberProperty");
    return getFieldValue(field);
  }

  jint memberComponentCount() const {
    static const auto field = javaClassStatic()->getField<jint>("memberComponentCount");
    return getFieldValue(field);
  }
};
#endif

struct JNativeAnimationExecutor : JavaClass<JNativeAnimationExecutor> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/NativeAnimationExecutor;";

  void setCallbacks(alias_ref<NativeAnimationPlatformCallbacks::javaobject> callbacks) const {
    static const auto method =
        javaClassStatic()->getMethod<void(alias_ref<NativeAnimationPlatformCallbacks::javaobject>)>("setCallbacks");
    method(self(), callbacks);
  }

  bool animatorsEnabled() const {
    static const auto method = javaClassStatic()->getMethod<jboolean()>("animatorsEnabled");
    return method(self()) != JNI_FALSE;
  }

  local_ref<JView> findView(const jint surfaceId, const jint tag) const {
    static const auto method = javaClassStatic()->getMethod<JView::javaobject(jint, jint)>("findView");
    return method(self(), surfaceId, tag);
  }

  bool isInWindow(const jint tag) const {
    static const auto method = javaClassStatic()->getMethod<jboolean(jint)>("isInWindow");
    return method(self(), tag) != JNI_FALSE;
  }

  local_ref<JPreparation> prepare(
      alias_ref<JView> view,
      const jint surfaceId,
      const jint tag,
      const jint owner,
      const jlong generation,
      const jdouble elapsedMs,
      alias_ref<JArrayInt> interruptedTargets,
      alias_ref<JArrayInt> trackInts,
      alias_ref<JArrayDouble> trackDoubles) const {
    static const auto method = javaClassStatic()
                                   ->getMethod<JPreparation::javaobject(
                                       alias_ref<JView>,
                                       jint,
                                       jint,
                                       jint,
                                       jlong,
                                       jdouble,
                                       alias_ref<JArrayInt>,
                                       alias_ref<JArrayInt>,
                                       alias_ref<JArrayDouble>)>("prepare");
    return method(
        self(), view, surfaceId, tag, owner, generation, elapsedMs, interruptedTargets, trackInts, trackDoubles);
  }

  void stop(
      const jint surfaceId,
      const jint tag,
      const jint owner,
      const jlong generation,
      const jint target,
      const jint mode) const {
    static const auto method = javaClassStatic()->getMethod<void(jint, jint, jint, jlong, jint, jint)>("stop");
    method(self(), surfaceId, tag, owner, generation, target, mode);
  }

  void requestDrain() const {
    static const auto method = javaClassStatic()->getMethod<void()>("requestDrain");
    method(self());
  }

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  local_ref<JNativeAnimationSample> sample(const jint tag, const jint target) const {
    static const auto method = javaClassStatic()->getMethod<JNativeAnimationSample::javaobject(jint, jint)>("sample");
    return method(self(), tag, target);
  }
#endif
};

} // namespace reanimated::native_animation
