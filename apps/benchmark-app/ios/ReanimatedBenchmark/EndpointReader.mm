#include "EndpointReader.h"

#include <mach/mach_error.h>
#include <mach/mach_time.h>
#include <pthread.h>
#include <sys/resource.h>

#include <cerrno>
#include <cstring>

namespace benchmark {

namespace {

const mach_timebase_info_data_t &timebase()
{
  static const mach_timebase_info_data_t info = [] {
    mach_timebase_info_data_t value;
    mach_timebase_info(&value);
    return value;
  }();
  return info;
}

uint64_t ticksToNs(uint64_t ticks)
{
  const auto &info = timebase();
  return static_cast<uint64_t>(static_cast<unsigned __int128>(ticks) * info.numer / info.denom);
}

uint64_t microseconds(time_value_t value)
{
  return static_cast<uint64_t>(value.seconds) * 1'000'000 + static_cast<uint64_t>(value.microseconds);
}

std::string failure(const char *call, const char *role, kern_return_t result)
{
  return std::string(call) + " failed for the " + role + ": " + mach_error_string(result);
}

std::optional<std::string> readThreadCpuUs(const ThreadHandle &thread, const char *role, uint64_t &cpuUs)
{
  thread_identifier_info_data_t identity;
  mach_msg_type_number_t count = THREAD_IDENTIFIER_INFO_COUNT;
  kern_return_t result =
      thread_info(thread.port, THREAD_IDENTIFIER_INFO, reinterpret_cast<thread_info_t>(&identity), &count);
  if (result != KERN_SUCCESS) {
    return failure("thread_info(THREAD_IDENTIFIER_INFO)", role, result);
  }
  if (identity.thread_id != thread.id) {
    return std::string("the handle of the ") + role + " " + std::to_string(thread.id) + " refers to the thread " +
        std::to_string(identity.thread_id);
  }
  thread_basic_info_data_t basic;
  count = THREAD_BASIC_INFO_COUNT;
  result = thread_info(thread.port, THREAD_BASIC_INFO, reinterpret_cast<thread_info_t>(&basic), &count);
  if (result != KERN_SUCCESS) {
    return failure("thread_info(THREAD_BASIC_INFO)", role, result);
  }
  cpuUs = microseconds(basic.user_time) + microseconds(basic.system_time);
  return std::nullopt;
}

uint64_t microseconds(timeval value)
{
  return static_cast<uint64_t>(value.tv_sec) * 1'000'000 + static_cast<uint64_t>(value.tv_usec);
}

std::optional<std::string> readProcessCpuUs(uint64_t &cpuUs)
{
  rusage usage;
  if (getrusage(RUSAGE_SELF, &usage) != 0) {
    return std::string("getrusage(RUSAGE_SELF) failed: ") + std::strerror(errno);
  }
  cpuUs = microseconds(usage.ru_utime) + microseconds(usage.ru_stime);
  return std::nullopt;
}

template <typename Read>
std::optional<std::string> bracketed(CounterRead &counter, Read read)
{
  counter.startNs = monotonicNs();
  auto error = read(counter.valueUs);
  counter.endNs = monotonicNs();
  return error;
}

} // namespace

uint64_t monotonicNs()
{
  return ticksToNs(mach_absolute_time());
}

uint64_t secondsToNs(double seconds)
{
  return static_cast<uint64_t>(seconds * 1e9);
}

uint64_t currentThreadId()
{
  uint64_t id = 0;
  pthread_threadid_np(nullptr, &id);
  return id;
}

ThreadHandle retainCurrentThread()
{
  return {mach_thread_self(), currentThreadId()};
}

std::optional<uint64_t> footprintKilobytes()
{
  task_vm_info_data_t info;
  mach_msg_type_number_t count = TASK_VM_INFO_COUNT;
  if (task_info(mach_task_self(), TASK_VM_INFO, reinterpret_cast<task_info_t>(&info), &count) != KERN_SUCCESS) {
    return std::nullopt;
  }
  return info.phys_footprint / 1024;
}

CpuReader::CpuReader(ThreadHandle uiThread, ThreadHandle jsThread) : uiThread_(uiThread), jsThread_(jsThread) {}

std::optional<std::string> CpuReader::read(CpuReading &reading) const
{
  if (auto error = bracketed(
          reading.uiThread, [this](uint64_t &value) { return readThreadCpuUs(uiThread_, "main thread", value); })) {
    return error;
  }
  if (auto error = bracketed(
          reading.jsThread, [this](uint64_t &value) { return readThreadCpuUs(jsThread_, "JS thread", value); })) {
    return error;
  }
  return bracketed(reading.process, readProcessCpuUs);
}

} // namespace benchmark
