#pragma once

//#define REANIMATED_PROFILING

#ifdef REANIMATED_PROFILING

#ifdef ANDROID
#include <android/trace.h>
#else
#include <os/signpost.h>
const os_log_t log_handle = os_log_create("reanimated", OS_LOG_CATEGORY_POINTS_OF_INTEREST);
#endif

#endif

namespace reanimated {

// Convenience macros that allow for easy marking of relevant sections both on Android and iOS

#ifdef REANIMATED_PROFILING

#ifdef ANDROID

// On android we use ATrace. The easiest way to produce a trace is to run profiling through Android Studio with System Trace recording.
// The result can be viewed through Perfetto web UI.

#define PROFILER_START(x) ATrace_beginSection(#x);

#define PROFILER_END(x) ATrace_endSection();

#else

// On iOS we use Xcode Instruments signposts. The trace can be produced and analyzed through Instruments.

#define PROFILER_START(x) \
void* pointer_##x = std::malloc(8); \
os_signpost_id_t signpost_id_##x = os_signpost_id_make_with_pointer(log_handle, pointer_##x); \
os_signpost_interval_begin(log_handle, signpost_id_##x, #x);

#define PROFILER_END(x) \
os_signpost_interval_end(log_handle, signpost_id_##x, #x); \
std::free(pointer_##x);

#endif // ANDROID

#define PROFILER_WRAP(fn, x) \
    PROFILER_START(x) \
    fn; \
    PROFILER_END(x)

#else

#define PROFILER_START(x)

#define PROFILER_END(x)

#define PROFILER_WRAP(fn, x) \
    fn

#endif

} // namespace reanimated
