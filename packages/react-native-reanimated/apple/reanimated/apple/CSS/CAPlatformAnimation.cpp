#include <reanimated/CSS/core/CSSPlatformAnimation.h>

#include <utility>

namespace reanimated::css {

class CAPlatformAnimation final : public CSSPlatformAnimation {
 public:
  explicit CAPlatformAnimation(std::shared_ptr<const apple::CAKeyframesMap> data) : data_(std::move(data)) {
    // TODO: Apply initial CA animations for all properties in data_.
  }

  ~CAPlatformAnimation() override {
    // TODO: Cancel all CA animations.
  }

  void update(std::shared_ptr<const apple::CAKeyframesMap> data) override {
    // TODO: Diff previous vs new properties, cancel removed, apply added.
    data_ = std::move(data);
  }

 private:
  std::shared_ptr<const apple::CAKeyframesMap> data_;
};

std::shared_ptr<CSSPlatformAnimation> CSSPlatformAnimation::create(std::shared_ptr<const apple::CAKeyframesMap> data) {
  return std::make_shared<CAPlatformAnimation>(std::move(data));
}

} // namespace reanimated::css
