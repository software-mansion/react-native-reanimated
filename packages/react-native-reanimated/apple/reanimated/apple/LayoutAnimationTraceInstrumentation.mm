// LayoutAnimationTrace start
#import <reanimated/apple/LayoutAnimationTraceInstrumentation.h>

#ifndef NDEBUG

#import <reanimated/LayoutAnimations/LayoutAnimationTraceRecorder.h>

#import <QuartzCore/QuartzCore.h>

#import <array>
#import <optional>
#import <utility>

namespace reanimated::layout_animation_trace {

namespace {

LayerValues traceLayerValues(CALayer *layer)
{
  const auto transform = layer.transform;
  return LayerValues{
      .opacity = layer.opacity,
      .position = Point{.x = layer.position.x, .y = layer.position.y},
      .bounds =
          Frame{
              .x = layer.bounds.origin.x,
              .y = layer.bounds.origin.y,
              .width = layer.bounds.size.width,
              .height = layer.bounds.size.height,
          },
      .transform =
          std::array<double, 16>{
              transform.m11,
              transform.m12,
              transform.m13,
              transform.m14,
              transform.m21,
              transform.m22,
              transform.m23,
              transform.m24,
              transform.m31,
              transform.m32,
              transform.m33,
              transform.m34,
              transform.m41,
              transform.m42,
              transform.m43,
              transform.m44,
          },
  };
}

Values traceViewValues(REAUIView<RCTComponentViewProtocol> *componentView)
{
  CALayer *layer = componentView.layer;
  CALayer *presentationLayer = layer.presentationLayer;
  const CGRect frame = componentView.frame;
  const CGRect accessibilityFrame = componentView.accessibilityFrame;

  Values values{
      .model = traceLayerValues(layer),
      .hostFrame =
          Frame{
              .x = frame.origin.x,
              .y = frame.origin.y,
              .width = frame.size.width,
              .height = frame.size.height,
          },
      .accessibilityFrame =
          Frame{
              .x = accessibilityFrame.origin.x,
              .y = accessibilityFrame.origin.y,
              .width = accessibilityFrame.size.width,
              .height = accessibilityFrame.size.height,
          },
  };
  if (presentationLayer != nil) {
    values.presentation = traceLayerValues(presentationLayer);
  }
  return values;
}

void recordAppleEvent(
    const EventName eventName,
    const ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView,
    const std::optional<bool> finished = std::nullopt,
    const std::optional<bool> platformAnimationCreated = std::nullopt)
{
  Event event;
  event.source = Source::IOS;
  event.event = eventName;
  event.tag = viewTag;
  event.animationType = descriptor.traceAnimationType;
  event.generation = descriptor.traceGeneration;
  event.finished = finished;
  event.platformAnimationCreated = platformAnimationCreated;
  if (componentView != nil) {
    event.values = traceViewValues(componentView);
  }
  Recorder::getInstance().record(std::move(event));
}

} // namespace

void recordApplePostMountObserved(
    const ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView)
{
  recordAppleEvent(EventName::PostMountObserved, viewTag, descriptor, componentView);
}

void recordAppleNativeViewLookup(
    const ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView)
{
  recordAppleEvent(EventName::NativeViewLookup, viewTag, descriptor, componentView, std::nullopt, componentView != nil);
}

void recordApplePlatformStarted(
    const ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView)
{
  recordAppleEvent(EventName::PlatformStarted, viewTag, descriptor, componentView, std::nullopt, true);
}

void recordAppleModelPresentationSample(
    const ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView)
{
  recordAppleEvent(EventName::ModelPresentationSample, viewTag, descriptor, componentView);
}

void recordApplePlatformCompleted(
    const ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView,
    const bool finished,
    const bool platformAnimationCreated)
{
  recordAppleEvent(
      EventName::PlatformCompleted, viewTag, descriptor, componentView, finished, platformAnimationCreated);
}

} // namespace reanimated::layout_animation_trace

#endif // NDEBUG
// LayoutAnimationTrace end
