#pragma once

#include <mach/mach.h>

#include <cstdint>
#include <optional>
#include <string>

namespace benchmark {

struct ThreadHandle {
  thread_act_t port;
  uint64_t id;
};

struct CounterRead {
  uint64_t startNs;
  uint64_t endNs;
  uint64_t valueUs;
};

struct CpuReading {
  CounterRead uiThread;
  CounterRead jsThread;
  CounterRead process;
};

uint64_t monotonicNs();

uint64_t secondsToNs(double seconds);

uint64_t currentThreadId();

ThreadHandle retainCurrentThread();

std::optional<uint64_t> footprintKilobytes();

class CpuReader {
 public:
  CpuReader(ThreadHandle uiThread, ThreadHandle jsThread);

  std::optional<std::string> read(CpuReading &reading) const;

 private:
  ThreadHandle uiThread_;
  ThreadHandle jsThread_;
};

} // namespace benchmark
