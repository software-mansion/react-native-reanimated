#import <React/RCTViewComponentView.h>

#import <react/renderer/components/CounterViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/CounterViewSpec/EventEmitters.h>
#import <react/renderer/components/CounterViewSpec/Props.h>

using namespace facebook::react;

@interface CounterComponentView : RCTViewComponentView
@end

@implementation CounterComponentView {
  dispatch_source_t _timer;
  int _count;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<CounterViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const CounterViewProps>();
    _props = defaultProps;
  }
  return self;
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self stopCounting];
  if (self.window != nil) {
    [self startCounting];
  }
}

- (void)startCounting
{
  _timer = dispatch_source_create(
      DISPATCH_SOURCE_TYPE_TIMER, 0, 0, dispatch_get_global_queue(QOS_CLASS_USER_INTERACTIVE, 0));
  dispatch_source_set_timer(_timer, DISPATCH_TIME_NOW, 16 * NSEC_PER_MSEC, 0);
  __weak CounterComponentView *weakSelf = self;
  dispatch_source_set_event_handler(
      _timer, ^{ dispatch_async(dispatch_get_main_queue(), ^{ [weakSelf emitCount]; }); });
  dispatch_resume(_timer);
}

- (void)stopCounting
{
  if (_timer != nil) {
    dispatch_source_cancel(_timer);
    _timer = nil;
  }
}

- (void)emitCount
{
  _count += 1;
  if (_eventEmitter != nullptr) {
    std::static_pointer_cast<const CounterViewEventEmitter>(_eventEmitter)
        ->onCount(CounterViewEventEmitter::OnCount{.count = _count});
  }
}

@end
