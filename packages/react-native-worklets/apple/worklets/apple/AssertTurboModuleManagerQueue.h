#import <react/debug/react_native_assert.h>

constexpr auto turboModuleManagerQueueLabel = "com.meta.react.turbomodulemanager.queue";

static bool IsTurboModuleManagerQueue() {
  const auto currentQueueLabel = dispatch_queue_get_label(DISPATCH_CURRENT_QUEUE_LABEL);
  return strcmp(currentQueueLabel, turboModuleManagerQueueLabel) == 0;
}

static void AssertTurboModuleManagerQueue() {
  react_native_assert(IsTurboModuleManagerQueue() && "This function must be called on the TurboModuleManager queue");
}
