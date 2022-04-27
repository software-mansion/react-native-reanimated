#import <React/RCTSurface.h>
#import <React/RCTSurfaceView.h>
#import <memory>

#import <RNReanimated/REAInitializerRCTFabricSurface.h>
#import <RNReanimated/REAModule.h>

@implementation REAInitializerRCTFabricSurface {
  std::shared_ptr<facebook::react::SurfaceHandler> _surfaceHandler;
  int _tag;
  RCTSurface *_surface;
  RCTSurfaceView *_view;
}

- (instancetype)init
{
  if (self = [super init]) {
    _tag = -1;
    _surface = [[RCTSurface alloc] init];
    _view = [[RCTSurfaceView alloc] initWithSurface:_surface];
    _surfaceHandler = std::make_shared<facebook::react::SurfaceHandler>("REASurface", _tag);
  }
  return self;
}

- (NSNumber *)rootViewTag
{
  return @(_tag);
}

- (NSInteger)rootTag
{
  return (NSInteger)_tag;
}

- (void)start
{
  // this is only needed method, the rest of them is just for prevent null pointer exceptions
  [_reaModule installReanimatedUIManagerBindingAfterReload];
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
