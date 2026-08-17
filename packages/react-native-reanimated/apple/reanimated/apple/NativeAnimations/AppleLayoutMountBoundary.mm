#import <reanimated/apple/NativeAnimations/AppleLayoutMountBoundary.h>

#import <reanimated/apple/REAUIView.h>

#import <React/RCTAssert.h>
#import <React/RCTComponent.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTSurfacePresenterStub.h>
#import <React/RCTUtils.h>

#import <QuartzCore/QuartzCore.h>

#import <mutex>
#import <utility>

namespace reanimated {
namespace {

// Mutex-guarded: registration and mount notifications can use different
// threads.
struct PostMountObserverSlot {
  std::mutex mutex;
  PostMountObserver observer;

  void set(PostMountObserver newObserver)
  {
    const std::lock_guard<std::mutex> lock(mutex);
    observer = std::move(newObserver);
  }

  void notify(const facebook::react::SurfaceId surfaceId)
  {
    PostMountObserver current;
    {
      const std::lock_guard<std::mutex> lock(mutex);
      current = observer;
    }
    if (current) {
      current(surfaceId);
    }
  }
};

facebook::react::SurfaceId surfaceIdForMountedView(REAUIView *view)
{
  while (view != nil) {
    if (RCTIsReactRootView(@(view.tag))) {
      return static_cast<facebook::react::SurfaceId>(view.tag);
    }
    view = view.superview;
  }
  return -1;
}

} // namespace
} // namespace reanimated

@interface REALayoutMountObserver : NSObject <RCTSurfacePresenterObserver>
- (instancetype)initWithSlot:(std::shared_ptr<reanimated::PostMountObserverSlot>)slot;
@end

@implementation REALayoutMountObserver {
  std::shared_ptr<reanimated::PostMountObserverSlot> _slot;
}

- (instancetype)initWithSlot:(std::shared_ptr<reanimated::PostMountObserverSlot>)slot
{
  if (self = [super init]) {
    _slot = std::move(slot);
  }
  return self;
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();
  _slot->notify(static_cast<facebook::react::SurfaceId>(rootTag));
}

@end

namespace reanimated {
namespace {

class AppleLayoutMountBoundary final : public LayoutMountBoundary {
 public:
  explicit AppleLayoutMountBoundary(RCTSurfacePresenter *surfacePresenter)
      : surfacePresenter_(surfacePresenter), slot_(std::make_shared<PostMountObserverSlot>())
  {
    mountObserver_ = [[REALayoutMountObserver alloc] initWithSlot:slot_];
    [surfacePresenter addObserver:mountObserver_];
  }

  ~AppleLayoutMountBoundary() override
  {
    RCTSurfacePresenter *surfacePresenter = surfacePresenter_;
    if (surfacePresenter != nil) {
      [surfacePresenter removeObserver:mountObserver_];
    }
  }

  void setPostMountObserver(PostMountObserver observer) override
  {
    slot_->set(std::move(observer));
  }

  std::optional<MountedViewState> mountedState(
      const facebook::react::SurfaceId surfaceId,
      const facebook::react::Tag tag) override
  {
    RCTAssertMainQueue();
    RCTSurfacePresenter *surfacePresenter = surfacePresenter_;
    if (surfacePresenter == nil) {
      return std::nullopt;
    }
    REAUIView<RCTComponentViewProtocol> *view =
        [surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
    if (view == nil || view.layer == nil || surfaceIdForMountedView(view) != surfaceId) {
      return std::nullopt;
    }
    // Layer position and bounds report the mounted geometry free of any
    // in-flight animation transform.
    CALayer *layer = view.layer;
    const CGPoint position = layer.position;
    const CGRect bounds = layer.bounds;
    const CGPoint anchorPoint = layer.anchorPoint;
    MountedViewState state;
    state.frame.origin.x = position.x - bounds.size.width * anchorPoint.x;
    state.frame.origin.y = position.y - bounds.size.height * anchorPoint.y;
    state.frame.size.width = bounds.size.width;
    state.frame.size.height = bounds.size.height;
    state.propsToken = reinterpret_cast<uintptr_t>([view props].get());
    return state;
  }

 private:
  __weak RCTSurfacePresenter *surfacePresenter_;
  std::shared_ptr<PostMountObserverSlot> slot_;
  REALayoutMountObserver *mountObserver_;
};

} // namespace

std::shared_ptr<LayoutMountBoundary> makeAppleLayoutMountBoundary(RCTSurfacePresenter *surfacePresenter)
{
  return std::make_shared<AppleLayoutMountBoundary>(surfacePresenter);
}

} // namespace reanimated
