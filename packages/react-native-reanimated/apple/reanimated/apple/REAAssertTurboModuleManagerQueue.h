#import <dispatch/dispatch.h>

#import <cstring>

#if __has_include(<React/Debug.h>)
#import <React/Debug.h>
#else
#import <react/debug/react_native_assert.h>
#endif

constexpr auto turboModuleManagerQueueLabel = "com.meta.react.turbomodulemanager.queue";

static bool REAIsTurboModuleManagerQueue() {
  const auto currentQueueLabel = dispatch_queue_get_label(DISPATCH_CURRENT_QUEUE_LABEL);
  return strcmp(currentQueueLabel, turboModuleManagerQueueLabel) == 0;
}

static void REAAssertTurboModuleManagerQueue() {
  react_native_assert(REAIsTurboModuleManagerQueue() && "This function must be called on the TurboModuleManager queue");
}
