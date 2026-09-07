#import "TouchBoxModule.h"
#import "RCTTouchBox.h"

#import <React/RCTBridge+Private.h>

#import <memory>
#import <worklets/Compat/StableApi.h>
#import <worklets/SharedItems/Serializable/SerializableWorklet.h>
#import <worklets/WorkletRuntime/WorkletRuntime.h>

using namespace facebook;
using namespace worklets;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation TouchBoxModule {
  std::shared_ptr<WorkletRuntime> _uiRuntime;
  std::shared_ptr<UIScheduler> _uiScheduler;
}

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE(TouchBoxModule);

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(install)
{
  jsi::Runtime &rnRuntime = *reinterpret_cast<jsi::Runtime *>(self.bridge.runtime);
  auto global = rnRuntime.global();

  _uiRuntime =
      getWorkletRuntimeFromHolder(rnRuntime, global.getPropertyAsObject(rnRuntime, "__UI_WORKLET_RUNTIME_HOLDER"));
  _uiScheduler = getUISchedulerFromHolder(rnRuntime, global.getPropertyAsObject(rnRuntime, "__UI_SCHEDULER_HOLDER"));

  auto uiRuntime = _uiRuntime;
  auto uiScheduler = _uiScheduler;

  rnRuntime.global().setProperty(
      rnRuntime,
      "__createTouchBoxController",
      jsi::Function::createFromHostFunction(
          rnRuntime,
          jsi::PropNameID::forAscii(rnRuntime, "__createTouchBoxController"),
          0,
          [uiRuntime, uiScheduler](
              jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
            static NSInteger nextControllerId = 1;
            const NSInteger controllerId = nextControllerId++;

            auto controller = jsi::Object(rt);
            controller.setProperty(rt, "id", static_cast<double>(controllerId));
            controller.setProperty(
                rt,
                "setHandler",
                jsi::Function::createFromHostFunction(
                    rt,
                    jsi::PropNameID::forAscii(rt, "setHandler"),
                    1,
                    [controllerId, uiRuntime, uiScheduler](
                        jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
                      auto handler = std::static_pointer_cast<SerializableWorklet>(extractSerializable(
                          rt,
                          args[0],
                          "[TouchBox] Handler must be a worklet function.",
                          Serializable::ValueType::WorkletType));

                      scheduleOnUI(uiScheduler, [controllerId, handler, uiRuntime]() {
                        [RCTTouchBox setHandler:handler forController:controllerId uiRuntime:uiRuntime];
                      });

                      return jsi::Value::undefined();
                    }));

            return controller;
          }));

  return @YES;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeTouchBoxModuleSpecJSI>(params);
}

@end
