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

struct ProcessTimes {
  uint64_t cpuUs;
  uint64_t performanceCpuUs;
  uint64_t clusterSwitches;
};

struct InstructionCounts {
  uint64_t instructions;
  uint64_t cycles;
};

template <typename Value>
struct CounterRead {
  uint64_t startNs;
  uint64_t endNs;
  Value value;
};

struct CpuReading {
  CounterRead<uint64_t> uiThread;
  CounterRead<uint64_t> jsThread;
  CounterRead<ProcessTimes> process;
  CounterRead<InstructionCounts> instructions;
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
