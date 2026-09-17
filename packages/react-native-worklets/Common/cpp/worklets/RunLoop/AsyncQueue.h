#pragma once

#include <jsi/jsi.h>

#include <cstdint>
#include <utility>

namespace worklets {

/**
 * Identifies the owner of a job, so that a queue shared between several owners
 * can cancel the jobs of one of them without touching the jobs of the others.
 * Runtime ids start at `RuntimeData::rnRuntimeId`, so zero marks an unowned
 * job.
 */
using AbortToken = uint64_t;

inline constexpr AbortToken noAbortToken{0};

class AsyncQueue : public facebook::jsi::NativeState {
 public:
  ~AsyncQueue() override = default;

  virtual void push(std::function<void()> &&job) = 0;

  /**
   * Pushes a job on behalf of the owner the token belongs to. The default
   * implementation discards the token, which is correct for a queue that is
   * never shared between owners.
   */
  virtual void push(std::function<void()> &&job, AbortToken /* abortToken */) {
    push(std::move(job));
  }

  /**
   * Drops the jobs that are still pending, destroying them on the calling
   * thread. A queue shared between several owners drops only the jobs pushed
   * with this token. The default implementation keeps every job.
   */
  virtual void abortPending(AbortToken /* abortToken */) {}
};

} // namespace worklets
