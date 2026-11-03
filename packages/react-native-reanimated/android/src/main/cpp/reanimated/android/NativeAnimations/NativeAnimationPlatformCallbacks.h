#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>

#include <fbjni/fbjni.h>

#include <functional>
#include <utility>

namespace reanimated::native_animation {

using namespace facebook::jni;

/// The calls of the Kotlin executor into the platform. UI thread only.
class NativeAnimationPlatformCallbacks : public HybridClass<NativeAnimationPlatformCallbacks> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/nativeAnimations/NativeAnimationPlatformCallbacks;";

  using TrackEndedFunction = std::function<void(const TrackKey &track, bool finished)>;
  using DrainFunction = std::function<void()>;

  void onTrackEnded(
      const jint surfaceId,
      const jint tag,
      const jint owner,
      const jlong generation,
      const jint target,
      const jboolean finished) {
    const AnimationHandle handle{surfaceId, tag, static_cast<AnimationOwner>(owner), static_cast<uint64_t>(generation)};
    onTrackEnded_({handle, static_cast<AnimationTarget>(target)}, finished != JNI_FALSE);
  }

  void drainPostedOperations() {
    drainPostedOperations_();
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("onTrackEnded", NativeAnimationPlatformCallbacks::onTrackEnded),
        makeNativeMethod("drainPostedOperations", NativeAnimationPlatformCallbacks::drainPostedOperations),
    });
  }

 private:
  friend HybridBase;

  NativeAnimationPlatformCallbacks(TrackEndedFunction onTrackEnded, DrainFunction drainPostedOperations)
      : onTrackEnded_(std::move(onTrackEnded)), drainPostedOperations_(std::move(drainPostedOperations)) {}

  TrackEndedFunction onTrackEnded_;
  DrainFunction drainPostedOperations_;
};

} // namespace reanimated::native_animation
