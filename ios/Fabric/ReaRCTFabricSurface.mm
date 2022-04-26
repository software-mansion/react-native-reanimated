#import <React/RCTSurface.h>
#import <React/RCTSurfaceView.h>
#import <memory>

#import <RNReanimated/REAModule.h>
#import <RNReanimated/ReaRCTFabricSurface.h>

@implementation ReaRCTFabricSurface {
  std::shared_ptr<facebook::react::SurfaceHandler> _surfaceHandler;
  int _reaTag;
  RCTSurface *_surface;
  RCTSurfaceView *_view;
}

- (instancetype)init
{
  if (self = [super init]) {
    _reaTag = -1;
    _surface = [[RCTSurface alloc] init];
    _view = [[RCTSurfaceView alloc] initWithSurface:_surface];
    _surfaceHandler = std::make_shared<facebook::react::SurfaceHandler>("REASurface", _reaTag);
  }
  return self;
}

- (NSNumber *)rootViewTag
{
  return @(_reaTag);
}

- (NSInteger)rootTag
{
  return (NSInteger)_reaTag;
}

- (void)start
{
  [_reaModule installUIManagerBindingAfterReload];
}

- (facebook::react::SurfaceHandler const &)surfaceHandler
{
  return *_surfaceHandler.get();
}

- (void)setMinimumSize:(CGSize)minimumSize maximumSize:(CGSize)maximumSize
{
}
- (void)setMinimumSize:(CGSize)minimumSize maximumSize:(CGSize)maximumSize viewportOffset:(CGPoint)viewportOffset
{
}
- (void)stop
{
}

- (CGSize)sizeThatFitsMinimumSize:(CGSize)minimumSize maximumSize:(CGSize)maximumSize
{
  CGSize size{0, 0};
  return size;
}

- (nonnull RCTSurfaceView *)view
{
  return _view;
}

@end
