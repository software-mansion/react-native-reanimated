#pragma once

#include <reanimated/NativeAnimations/NativeAnimationDispatcher.h>

#include <react/debug/react_native_assert.h>

namespace reanimated::native_animation {

inline std::shared_ptr<NativeAnimationService> makeNativeAnimationService(
    const std::shared_ptr<PlatformUIScheduler> &platformUIScheduler,
    const std::shared_ptr<NativeAnimationTargetResolver> &targetResolver,
    const std::shared_ptr<NativeAnimationExecutor> &executor
#ifndef NDEBUG
    ,
    std::shared_ptr<NativeAnimationTraceSink> traceSink = std::make_shared<NullNativeAnimationTraceSink>(),
#else
    ,
#endif
    std::shared_ptr<NativeAnimationConflictPolicy> conflictPolicy =
        std::make_shared<DefaultNativeAnimationConflictPolicy>()) {
  // The coordinator dereferences the sink at every trace point. The release
  // form of react_native_assert discards its argument, so the debug-only
  // traceSink parameter needs no preprocessor guard here.
  react_native_assert(traceSink != nullptr);
  react_native_assert(conflictPolicy != nullptr);
  auto targetRegistry = std::make_shared<NativeAnimationTargetRegistry>();
  auto coordinator = std::make_shared<NativeAnimationCoordinator>(
      std::move(conflictPolicy),
      std::move(targetRegistry),
      targetResolver,
      executor
#ifndef NDEBUG
      ,
      std::move(traceSink)
#endif
  );
  return std::make_shared<NativeAnimationDispatcher>(platformUIScheduler, std::move(coordinator));
}

} // namespace reanimated::native_animation
