#pragma once

#include <optional>

namespace worklets {

/**
 * Brackets a platform frame callback whose timestamp JS should observe as
 * `__frameTimestamp` for the whole callback, including work that runs after the
 * JS flush clears its own override.
 *
 * Nested scopes restore the outer timestamp. Outside any scope, `current()` is
 * empty — a finished frame's timestamp is not kept around.
 */
class FrameTimestampScope {
 public:
  explicit FrameTimestampScope(double timestampMs);
  ~FrameTimestampScope();

  FrameTimestampScope(const FrameTimestampScope &) = delete;
  FrameTimestampScope &operator=(const FrameTimestampScope &) = delete;

  static std::optional<double> current();

 private:
  std::optional<double> previous_;
  bool active_;
};

} // namespace worklets
