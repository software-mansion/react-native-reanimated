#include <worklets/RunLoop/FrameTimestamp.h>

namespace worklets {

namespace {

struct FrameTimestampState {
  std::optional<double> current;
};

FrameTimestampState &state() {
  thread_local FrameTimestampState state;
  return state;
}

} // namespace

FrameTimestampScope::FrameTimestampScope(double timestampMs) : previous_(state().current), active_(true) {
  state().current = timestampMs;
}

FrameTimestampScope::~FrameTimestampScope() {
  if (active_) {
    state().current = previous_;
  }
}

std::optional<double> FrameTimestampScope::current() {
  return state().current;
}

} // namespace worklets
