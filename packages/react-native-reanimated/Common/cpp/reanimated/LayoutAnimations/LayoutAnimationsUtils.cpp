#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

#include <memory>
#include <unordered_map>

namespace reanimated {

std::unordered_map<Tag, UpdateValues> &SurfaceManager::getUpdateMap(SurfaceId surfaceId) {
  auto props = props_.find(surfaceId);
  if (props != props_.end()) {
    return *props->second;
  }

  auto newProps = std::make_shared<std::unordered_map<Tag, UpdateValues>>();
  props_.insert_or_assign(surfaceId, newProps);
  return *newProps;
}

void SurfaceManager::updateWindow(const SurfaceId surfaceId, const double windowWidth, const double windowHeight) {
  windows_.insert_or_assign(surfaceId, Rect{windowWidth, windowHeight});
}

Rect SurfaceManager::getWindow(SurfaceId surfaceId) {
  auto windowIt = windows_.find(surfaceId);
  if (windowIt != windows_.end()) {
    return windowIt->second;
  }
  return Rect{0, 0};
}

} // namespace reanimated
