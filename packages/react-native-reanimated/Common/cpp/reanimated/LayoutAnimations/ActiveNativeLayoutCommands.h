#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>

#include <algorithm>
#include <optional>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

// Native layout commands that still own physical targets, keyed by handle. A
// view can hold more than one record after a partial replacement. `Record`
// must expose `handle`, `targets`, and `admissionGranted`.
template <typename Record>
class ActiveNativeLayoutCommands {
 public:
  void insert(Record record) {
    const auto handle = record.handle;
    records_.insert_or_assign(handle, std::move(record));
  }

  Record *find(const native_animation::AnimationHandle &handle) {
    const auto it = records_.find(handle);
    return it == records_.end() ? nullptr : &it->second;
  }

  std::optional<Record> take(const native_animation::AnimationHandle &handle) {
    const auto it = records_.find(handle);
    if (it == records_.end()) {
      return std::nullopt;
    }
    std::optional<Record> record = std::move(it->second);
    records_.erase(it);
    return record;
  }

  // Returns a copy, so a caller can cancel each handle while terminal
  // results erase records.
  std::vector<native_animation::AnimationHandle> handlesForTag(const native_animation::Tag tag) const {
    std::vector<native_animation::AnimationHandle> handles;
    for (const auto &[handle, record] : records_) {
      if (handle.tag == tag) {
        handles.push_back(handle);
      }
    }
    return handles;
  }

  bool claims(
      const native_animation::SurfaceId surfaceId,
      const native_animation::Tag tag,
      const native_animation::AnimationTarget &target) const {
    return std::ranges::any_of(records_, [&](const auto &entry) {
      const auto &[handle, record] = entry;
      return handle.surfaceId == surfaceId && handle.tag == tag && record.admissionGranted &&
          std::ranges::any_of(record.targets, [&](const native_animation::AnimationTarget &owned) {
               return native_animation::targetsConflict(owned, target);
             });
    });
  }

  bool empty() const {
    return records_.empty();
  }

 private:
  std::unordered_map<native_animation::AnimationHandle, Record, native_animation::AnimationHandleHash> records_;
};

} // namespace reanimated
