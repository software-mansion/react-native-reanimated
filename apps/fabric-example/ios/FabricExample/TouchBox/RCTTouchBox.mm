#import "RCTTouchBox.h"

#import <react/renderer/components/AppSpec/ComponentDescriptors.h>
#import <react/renderer/components/AppSpec/EventEmitters.h>
#import <react/renderer/components/AppSpec/Props.h>
#import <react/renderer/components/AppSpec/RCTComponentViewHelpers.h>

#import <React/RCTLog.h>

#import <unordered_map>

#import <worklets/Compat/StableApi.h>

using namespace facebook;
using namespace facebook::react;

static std::shared_ptr<worklets::WorkletRuntime> gUiRuntime;
static std::unordered_map<NSInteger, std::shared_ptr<worklets::SerializableWorklet>> gPendingHandlers;

@interface RCTTouchBox () <RCTTouchBoxViewProtocol>
- (void)applyState:(facebook::jsi::Runtime &)rt state:(const facebook::jsi::Object &)state;
- (void)attachHandler:(std::shared_ptr<worklets::SerializableWorklet>)handler
            uiRuntime:(std::shared_ptr<worklets::WorkletRuntime>)uiRuntime;
@end

@implementation RCTTouchBox {
  std::shared_ptr<worklets::WorkletRuntime> _uiRuntime;
  std::unique_ptr<jsi::Function> _onTouch;
  NSInteger _controllerId;
}

+ (NSMapTable<NSNumber *, RCTTouchBox *> *)registry
{
  static NSMapTable<NSNumber *, RCTTouchBox *> *registry;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    registry = [NSMapTable strongToWeakObjectsMapTable];
  });
  return registry;
}

+ (void)setHandler:(std::shared_ptr<worklets::SerializableWorklet>)handler
     forController:(NSInteger)controllerId
         uiRuntime:(std::shared_ptr<worklets::WorkletRuntime>)uiRuntime
{
  gUiRuntime = uiRuntime;

  auto *box = [[self registry] objectForKey:@(controllerId)];
  if (box) {
    [box attachHandler:handler uiRuntime:uiRuntime];
    return;
  }

  gPendingHandlers[controllerId] = handler;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<TouchBoxComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const TouchBoxProps>();
    _props = defaultProps;
    self.userInteractionEnabled = YES;
  }
  return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &next = *std::static_pointer_cast<const TouchBoxProps>(props);
  [super updateProps:props oldProps:oldProps];

  if (next.controllerId == _controllerId) {
    return;
  }

  _controllerId = next.controllerId;
  [[RCTTouchBox registry] setObject:self forKey:@(_controllerId)];

  auto pending = gPendingHandlers.find(_controllerId);
  if (pending != gPendingHandlers.end() && gUiRuntime) {
    [self attachHandler:pending->second uiRuntime:gUiRuntime];
    gPendingHandlers.erase(pending);
  }
}

- (void)prepareForRecycle
{
  [[RCTTouchBox registry] removeObjectForKey:@(_controllerId)];
  _controllerId = 0;
  _onTouch = nullptr;
  _uiRuntime = nullptr;
  [super prepareForRecycle];
}

- (void)attachHandler:(std::shared_ptr<worklets::SerializableWorklet>)handler
            uiRuntime:(std::shared_ptr<worklets::WorkletRuntime>)uiRuntime
{
  _uiRuntime = uiRuntime;

  jsi::Runtime &rt = worklets::getJSIRuntimeFromWorkletRuntime(uiRuntime);
  __weak RCTTouchBox *weakSelf = self;

  auto applyState = jsi::Function::createFromHostFunction(
      rt,
      jsi::PropNameID::forAscii(rt, "applyState"),
      1,
      [weakSelf](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
        [weakSelf applyState:rt state:args[0].asObject(rt)];
        return jsi::Value::undefined();
      });

  try {
    jsi::Value result = _uiRuntime->runSync(handler, jsi::Value(std::move(applyState)));
    _onTouch = std::make_unique<jsi::Function>(result.asObject(rt).asFunction(rt));
  } catch (const std::exception &error) {
    RCTLogError(@"[TouchBox] Attaching the handler failed: %s", error.what());
  }
}

- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesBegan:touches withEvent:event];
  [self dispatchTouches:touches phase:"began"];
}

- (void)touchesMoved:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesMoved:touches withEvent:event];
  [self dispatchTouches:touches phase:"moved"];
}

- (void)touchesEnded:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  [super touchesEnded:touches withEvent:event];
  [self dispatchTouches:touches phase:"ended"];
}

- (void)applyState:(jsi::Runtime &)rt state:(const jsi::Object &)state
{
  self.transform = CGAffineTransformRotate(
      CGAffineTransformMakeTranslation(
          state.getProperty(rt, "translateX").asNumber(), state.getProperty(rt, "translateY").asNumber()),
      state.getProperty(rt, "rotate").asNumber());
}

- (void)dispatchTouches:(NSSet<UITouch *> *)touches phase:(const char *)phase
{
  if (!_onTouch || !_uiRuntime) {
    return;
  }

  CGPoint point = [[touches anyObject] locationInView:self.superview];
  jsi::Runtime &rt = worklets::getJSIRuntimeFromWorkletRuntime(_uiRuntime);

  auto touch = jsi::Object(rt);
  touch.setProperty(rt, "x", point.x);
  touch.setProperty(rt, "y", point.y);
  touch.setProperty(rt, "phase", jsi::String::createFromAscii(rt, phase));

  try {
    _uiRuntime->runSync(*_onTouch, jsi::Value(std::move(touch)));
  } catch (const std::exception &error) {
    RCTLogError(@"[TouchBox] Handler failed: %s", error.what());
  }
}

@end

Class<RCTComponentViewProtocol> TouchBoxCls(void)
{
  return RCTTouchBox.class;
}
