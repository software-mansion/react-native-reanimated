#pragma once
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <mutex>
namespace reanimated {
using UpdatesBatch = std::vector<std::pair<ShadowNodeFamily::Shared, folly::dynamic>>;
struct UpdatesRegistry {
  PropsMap props;
  void remove(int) {}
  void collectProps(PropsMap &out) {
    for (const auto &[family, values] : props)
      for (const auto &value : values)
        out[family].emplace_back(value);
  }
};
} // namespace reanimated
