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

  void install(const alias_ref<JArrayLong> &replacedTracks) const {
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
struct JNativeAnimationMember : JavaClass<JNativeAnimationMember> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/NativeAnimationMember;";

  local_ref<JArrayDouble> doublesOf(const char *name) const {
    return getFieldValue(javaClassStatic()->getField<JArrayDouble::javaobject>(name));
  }

  local_ref<JString> property() const {
    static const auto field = javaClassStatic()->getField<JString::javaobject>("property");
    return getFieldValue(field);
  }

  jint componentCount() const {
    static const auto field = javaClassStatic()->getField<jint>("componentCount");
    return getFieldValue(field);
  }
};

struct JNativeAnimationContainerSizes : JavaClass<JNativeAnimationContainerSizes> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/NativeAnimationContainerSizes;";

  jint playbacks() const {
    static const auto field = javaClassStatic()->getField<jint>("playbacks");
    return getFieldValue(field);
  }

  jint geometryWriters() const {
    static const auto field = javaClassStatic()->getField<jint>("geometryWriters");
    return getFieldValue(field);
  }
};

struct JNativeAnimationSample : JavaClass<JNativeAnimationSample> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/NativeAnimationSample;";

  local_ref<JArrayDouble> doublesOf(const char *name) const {
    return getFieldValue(javaClassStatic()->getField<JArrayDouble::javaobject>(name));
  }

  local_ref<JArrayLong> playbacks() const {
    static const auto field = javaClassStatic()->getField<JArrayLong::javaobject>("playbacks");
    return getFieldValue(field);
  }

  local_ref<JArrayClass<JNativeAnimationMember::javaobject>> members() const {
    static const auto field =
        javaClassStatic()->getField<JArrayClass<JNativeAnimationMember::javaobject>::javaobject>("members");
    return getFieldValue(field);
  }
};
#endif

struct JNativeAnimationExecutor : JavaClass<JNativeAnimationExecutor> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/NativeAnimationExecutor;";

  void setCallbacks(const alias_ref<NativeAnimationPlatformCallbacks::javaobject> &callbacks) const {
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

  bool isInWindow(const jint surfaceId, const jint tag) const {
    static const auto method = javaClassStatic()->getMethod<jboolean(jint, jint)>("isInWindow");
    return method(self(), surfaceId, tag) != JNI_FALSE;
  }

  local_ref<JArrayDouble> modelOf(const alias_ref<JView> &view, const jint target) const {
    static const auto method =
        javaClassStatic()->getMethod<JArrayDouble::javaobject(alias_ref<JView>, jint)>("modelOf");
    return method(self(), view, target);
  }

  void setModel(
      const jint surfaceId,
      const jint tag,
      const jint owner,
      const jlong generation,
      const jint target,
      const jdouble value) const {
    static const auto method = javaClassStatic()->getMethod<void(jint, jint, jint, jlong, jint, jdouble)>("setModel");
    method(self(), surfaceId, tag, owner, generation, target, value);
  }

  local_ref<JPreparation> prepare(
      const alias_ref<JView> &view,
      const jint surfaceId,
      const jint tag,
      const jint owner,
      const jlong generation,
      const jdouble passTimestampMs,
      const jdouble originTimestampMs,
      const alias_ref<JArrayInt> &interruptedTargets,
      const alias_ref<JArrayInt> &trackInts,
      const alias_ref<JArrayDouble> &trackDoubles) const {
    static const auto method = javaClassStatic()
                                   ->getMethod<JPreparation::javaobject(
                                       alias_ref<JView>,
                                       jint,
                                       jint,
                                       jint,
                                       jlong,
                                       jdouble,
                                       jdouble,
                                       alias_ref<JArrayInt>,
                                       alias_ref<JArrayInt>,
                                       alias_ref<JArrayDouble>)>("prepare");
    return method(
        self(),
        view,
        surfaceId,
        tag,
        owner,
        generation,
        passTimestampMs,
        originTimestampMs,
        interruptedTargets,
        trackInts,
        trackDoubles);
  }

  void stop(
      const jint surfaceId,
      const jint tag,
      const jint owner,
      const jlong generation,
      const jint target,
      const jint mode,
      const jboolean inDispatch) const {
    static const auto method =
        javaClassStatic()->getMethod<void(jint, jint, jint, jlong, jint, jint, jboolean)>("stop");
    method(self(), surfaceId, tag, owner, generation, target, mode, inDispatch);
  }

  void requestDrain() const {
    static const auto method = javaClassStatic()->getMethod<void()>("requestDrain");
    method(self());
  }
};

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
struct JNativeAnimationTestHooks : JavaClass<JNativeAnimationTestHooks> {
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/nativeAnimations/NativeAnimationTestHooks;";

  static local_ref<JNativeAnimationSample>
  sample(const alias_ref<JNativeAnimationExecutor::javaobject> &executor, const jint tag, const jint target) {
    static const auto method = javaClassStatic()
                                   ->getStaticMethod<JNativeAnimationSample::javaobject(
                                       alias_ref<JNativeAnimationExecutor::javaobject>, jint, jint)>("sample");
    return method(javaClassStatic(), executor, tag, target);
  }

  static local_ref<JNativeAnimationContainerSizes> containerSizes(
      const alias_ref<JNativeAnimationExecutor::javaobject> &executor) {
    static const auto method = javaClassStatic()
                                   ->getStaticMethod<JNativeAnimationContainerSizes::javaobject(
                                       alias_ref<JNativeAnimationExecutor::javaobject>)>("containerSizes");
    return method(javaClassStatic(), executor);
  }
};
#endif

} // namespace reanimated::native_animation
