/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTSurfacePointerHandler.h"

#import <React/RCTIdentifierPool.h>
#import <React/RCTReactTaggedView.h>
#import <React/RCTUtils.h>
#import <React/RCTViewComponentView.h>

#import "RCTConversions.h"
#import "RCTTouchableComponentViewProtocol.h"

using namespace facebook::react;

typedef NS_ENUM(NSInteger, RCTPointerEventType) {
  RCTPointerEventTypeStart,
  RCTPointerEventTypeMove,
  RCTPointerEventTypeEnd,
  RCTPointerEventTypeCancel,
};

#if !TARGET_OS_OSX // [macOS]
static BOOL AllTouchesAreCancelledOrEnded(NSSet<UITouch *> *touches)
{
  for (UITouch *touch in touches) {
    if (touch.phase == UITouchPhaseBegan || touch.phase == UITouchPhaseMoved || touch.phase == UITouchPhaseStationary) {
      return NO;
    }
  }
  return YES;
}

static BOOL AnyTouchesChanged(NSSet<UITouch *> *touches)
{
  for (UITouch *touch in touches) {
    if (touch.phase == UITouchPhaseBegan || touch.phase == UITouchPhaseMoved) {
      return YES;
    }
  }
  return NO;
}
#endif // [macOS]

struct ActivePointer {
  /*
   * Pointer ID
   */
  NSInteger identifier;

  /*
   * The component view on which the touch started.
   */
  RCTPlatformView<RCTComponentViewProtocol> *initialComponentView = nil; // [macOS]

  /*
   * The current target component view of the pointer
   */
  RCTPlatformView<RCTComponentViewProtocol> *componentView = nil; // [macOS]

  /*
   * The location of the pointer relative to the root component view
   */
  CGPoint clientPoint;

  /*
   * The location of the pointer relative to the device's screen
   */
  CGPoint screenPoint;

  /*
   * The location of the pointer relative to the pointer's target
   */
  CGPoint offsetPoint;

  /*
   * Current timestamp of the pointer event
   */
  NSTimeInterval timestamp;

  /*
   * The current force of the pointer
   */
  Float force;

  /*
   * The type of touch received.
   */
  UITouchType touchType;

  /*
   * The radius (in points) of the touch.
   */
  CGFloat majorRadius;

  /*
   * The altitude (in radians) of the stylus.
   */
  CGFloat altitudeAngle;

  /*
   * The azimuth angle (in radians) of the stylus.
   */
  CGFloat azimuthAngle;

  /*
   * The button mask of the touch
   */
  UIEventButtonMask buttonMask;

  /*
   * The bit mask of modifier flags in the gesture represented by the receiver.
   */
  UIKeyModifierFlags modifierFlags;

  /*
   * Indicates if the active touch represents the primary pointer of this pointer type.
   */
  BOOL isPrimary;

  /*
   * The button number that was pressed (if applicable) when the event was fired.
   */
  NSInteger button;

  /*
   * Informs the event system that when the touch is released it should be treated as the
   * pointer leaving the screen entirely.
   */
  BOOL shouldLeaveWhenReleased;

  struct Hasher {
    size_t operator()(const ActivePointer &activePointer) const
    {
      return std::hash<decltype(activePointer.identifier)>()(activePointer.identifier);
    }
  };

  struct Comparator {
    bool operator()(const ActivePointer &lhs, const ActivePointer &rhs) const
    {
      return lhs.identifier == rhs.identifier;
    }
  };
};

// Mouse and Pen pointers get reserved IDs so they stay consistent no matter the order
// at which events come in
static NSInteger constexpr kMousePointerId = 0;
static NSInteger constexpr kPencilPointerId = 1;

// If a new reserved ID is added above this should be incremented to ensure touch events
// do not conflict
static NSInteger constexpr kTouchIdentifierPoolOffset = 2;

static SharedTouchEventEmitter GetTouchEmitterFromView(RCTUIView *componentView, CGPoint point) // [macOS]
{
  return [(id<RCTTouchableComponentViewProtocol>)componentView touchEventEmitterAtPoint:point];
}

static NSOrderedSet<RCTReactTaggedView *> *GetTouchableViewsInPathToRoot(RCTPlatformView *componentView) // [macOS]
{
  NSMutableOrderedSet *results = [NSMutableOrderedSet orderedSet];
  do {
    if ([componentView respondsToSelector:@selector(touchEventEmitterAtPoint:)]) {
      [results addObject:[RCTReactTaggedView wrap:componentView]];
    }
    componentView = componentView.superview;
  } while (componentView);
  return results;
}

static RCTPlatformView *FindClosestFabricManagedTouchableView(RCTPlatformView *componentView) // [macOS]
{
  while (componentView) {
    if ([componentView respondsToSelector:@selector(touchEventEmitterAtPoint:)]) {
      return componentView;
    }
    componentView = componentView.superview;
  }
  return nil;
}

static NSInteger ButtonMaskDiffToButton(UIEventButtonMask prevButtonMask, UIEventButtonMask curButtonMask)
{
#if !TARGET_OS_OSX // [macOS]
  if ((prevButtonMask & UIEventButtonMaskPrimary) != (curButtonMask & UIEventButtonMaskPrimary)) {
    return 0;
  }
  if ((prevButtonMask & 0x4) != (curButtonMask & 0x4)) {
    return 1;
  }
  if ((prevButtonMask & UIEventButtonMaskSecondary) != (curButtonMask & UIEventButtonMaskSecondary)) {
    return 2;
  }
#endif // [macOS]

  return -1;
}

// Returns a CGPoint which represents the tiltX/Y values (in RADIANS)
// Adapted from https://gist.github.com/k3a/2903719bb42b48c9198d20c2d6f73ac1
static CGPoint SphericalToTilt(CGFloat altitudeAngleRad, CGFloat azimuthAngleRad)
{
  if (altitudeAngleRad == M_PI / 2.0) {
    return CGPointMake(0.0, 0.0);
  } else if (altitudeAngleRad == 0.0) {
    // when pen is laying on the pad it is impossible to precisely encode but at least approximate for 4 cases
    if (azimuthAngleRad > 7.0 * M_PI / 4.0 || azimuthAngleRad <= M_PI / 4.0) {
      // for azimuthRad == 0, the pen is on the positive Y axis
      return CGPointMake(0.0, M_PI / 2.0);
    } else if (azimuthAngleRad > M_PI / 4.0 && azimuthAngleRad <= 3 * M_PI / 4.0) {
      // for azimuthRad == math.pi/2 the pen is on the positive X axis
      return CGPointMake(M_PI / 2.0, 0.0);
    } else if (azimuthAngleRad > 3.0 * M_PI / 4.0 && azimuthAngleRad <= 5.0 * M_PI / 4.0) {
      // for azimuthRad == math.pi, the pen is on the negative Y axis
      return CGPointMake(0.0, -M_PI / 2.0);
    } else if (azimuthAngleRad > 5.0 * M_PI / 4.0 && azimuthAngleRad <= 7.0 * M_PI / 4.0) {
      // for azimuthRad == math.pi + math.pi/2 pen on negative X axis
      return CGPointMake(-M_PI / 2.0, 0.0);
    }
  }

  CGFloat tanAlt = tan(altitudeAngleRad); // tan(x) = sin(x)/cos(x)

  CGFloat tiltXrad = atan(sin(azimuthAngleRad) / tanAlt);
  CGFloat tiltYrad = atan(cos(azimuthAngleRad) / tanAlt);

  return CGPointMake(tiltXrad, tiltYrad);
}

static CGFloat RadsToDegrees(CGFloat rads)
{
  return rads * 180 / M_PI;
}

static NSInteger ButtonMaskToButtons(UIEventButtonMask buttonMask)
{
  NSInteger buttonsMaskResult = 0;
#if !TARGET_OS_OSX // [macOS]
  if ((buttonMask & UIEventButtonMaskPrimary) != 0) {
    buttonsMaskResult |= 1;
  }
  if ((buttonMask & UIEventButtonMaskSecondary) != 0) {
    buttonsMaskResult |= 2;
  }
  // undocumented mask value which represents the "auxiliary button" (i.e. middle mouse button)
  if ((buttonMask & 0x4) != 0) {
    buttonsMaskResult |= 4;
  }
#endif // [macOS]
  return buttonsMaskResult;
}

#if !TARGET_OS_OSX // [macOS]
static const char *PointerTypeCStringFromUITouchType(UITouchType type)
{
  switch (type) {
    case UITouchTypeDirect:
      return "touch";
    case UITouchTypePencil:
      return "pen";
    case UITouchTypeIndirectPointer:
      return "mouse";
    case UITouchTypeIndirect:
    default:
      return "";
  }
}

static void UpdatePointerEventModifierFlags(PointerEvent &event, UIKeyModifierFlags flags)
{
  event.ctrlKey = (flags & UIKeyModifierControl) != 0;
  event.shiftKey = (flags & UIKeyModifierShift) != 0;
  event.altKey = (flags & UIKeyModifierAlternate) != 0;
  event.metaKey = (flags & UIKeyModifierCommand) != 0;
}

static PointerEvent CreatePointerEventFromActivePointer(
    ActivePointer activePointer,
    RCTPointerEventType eventType,
    UIView *rootComponentView)
{
  PointerEvent event = {};
  event.pointerId = activePointer.identifier;
  event.pointerType = PointerTypeCStringFromUITouchType(activePointer.touchType);

  if (eventType == RCTPointerEventTypeCancel) {
    event.clientPoint = RCTPointFromCGPoint(CGPointZero);
#if !TARGET_OS_VISION // [visionOS]
    event.screenPoint =
        RCTPointFromCGPoint([rootComponentView convertPoint:CGPointZero
                                          toCoordinateSpace:rootComponentView.window.screen.coordinateSpace]);
#endif // [visionOS]
    event.offsetPoint = RCTPointFromCGPoint([rootComponentView convertPoint:CGPointZero
                                                                     toView:activePointer.componentView]);
  } else {
    event.clientPoint = RCTPointFromCGPoint(activePointer.clientPoint);
    event.screenPoint = RCTPointFromCGPoint(activePointer.screenPoint);
    event.offsetPoint = RCTPointFromCGPoint(activePointer.offsetPoint);
  }

  event.pressure = activePointer.force;

  if (activePointer.touchType == UITouchTypeIndirectPointer) {
    // pointer events with a mouse button pressed should report a pressure of 0.5
    // when the touch is down and 0.0 when it is lifted regardless of how it is reported by the OS
    event.pressure = eventType != RCTPointerEventTypeEnd ? 0.5 : 0.0;
  }

  CGFloat pointerSize = activePointer.majorRadius * 2.0;

  if (activePointer.touchType == UITouchTypeIndirectPointer) {
    // mouse type pointers should always report a size of 1
    pointerSize = 1.0;
  }

  event.width = pointerSize;
  event.height = pointerSize;

  CGPoint tilt = SphericalToTilt(activePointer.altitudeAngle, activePointer.azimuthAngle);
  event.tiltX = RadsToDegrees(tilt.x);
  event.tiltY = RadsToDegrees(tilt.y);

  event.detail = 0;

  event.button = activePointer.button;
  event.buttons = ButtonMaskToButtons(activePointer.buttonMask);

  UpdatePointerEventModifierFlags(event, activePointer.modifierFlags);

  event.tangentialPressure = 0.0;
  event.twist = 0;
  event.isPrimary = activePointer.isPrimary;

  return event;
}

static PointerEvent CreatePointerEventFromIncompleteHoverData(
    NSInteger pointerId,
    std::string pointerType,
    CGPoint clientLocation,
    CGPoint screenLocation,
    CGPoint offsetLocation,
    UIKeyModifierFlags modifierFlags)
{
  PointerEvent event = {};
  event.pointerId = pointerId;
  event.pressure = 0.0;
  event.pointerType = pointerType;
  event.clientPoint = RCTPointFromCGPoint(clientLocation);
  event.screenPoint = RCTPointFromCGPoint(screenLocation);
  event.offsetPoint = RCTPointFromCGPoint(offsetLocation);
  event.width = 1.0;
  event.height = 1.0;
  event.tiltX = 0;
  event.tiltY = 0;
  event.detail = 0;
  event.button = -1;
  event.buttons = 0;
  UpdatePointerEventModifierFlags(event, modifierFlags);
  event.tangentialPressure = 0.0;
  event.twist = 0;
  event.isPrimary = true;

  return event;
}
#endif // [macOS]

static void UpdateActivePointerWithUITouch(
    ActivePointer &activePointer,
    RCTUITouch *uiTouch, // [macOS]
    UIEvent *uiEvent,
    RCTUIView *rootComponentView) // [macOS]
{
#if !TARGET_OS_OSX // [macOS]
  CGPoint location = [uiTouch locationInView:rootComponentView];
  UIView *hitTestedView = [rootComponentView hitTest:location withEvent:nil];
  activePointer.componentView = FindClosestFabricManagedTouchableView(hitTestedView);
#else // [macOS
  CGPoint touchLocation = [rootComponentView.superview convertPoint:uiTouch.locationInWindow fromView:nil];
  activePointer.componentView = (RCTUIView *) [rootComponentView hitTest:touchLocation];
#endif // macOS]

#if !TARGET_OS_OSX // [macOS]
  activePointer.clientPoint = [uiTouch locationInView:rootComponentView];
#if !TARGET_OS_VISION // [visionOS]
  activePointer.screenPoint = [rootComponentView convertPoint:activePointer.clientPoint
                                            toCoordinateSpace:rootComponentView.window.screen.coordinateSpace];
#endif // [visionOS]
  activePointer.offsetPoint = [uiTouch locationInView:activePointer.componentView];
#else // [macOS
  activePointer.offsetPoint = [activePointer.componentView convertPoint:uiTouch.locationInWindow fromView:nil];
  activePointer.screenPoint = uiTouch.locationInWindow;
  activePointer.clientPoint = CGPointMake(activePointer.screenPoint.x, CGRectGetHeight(rootComponentView.window.frame) - activePointer.screenPoint.y);
#endif // macOS]

  activePointer.timestamp = uiTouch.timestamp;

#if !TARGET_OS_OSX // [macOS]
  activePointer.force = RCTZeroIfNaN(uiTouch.force / uiTouch.maximumPossibleForce);

  activePointer.touchType = uiTouch.type;
  activePointer.majorRadius = uiTouch.majorRadius;
  activePointer.altitudeAngle = uiTouch.altitudeAngle;
  activePointer.azimuthAngle = [uiTouch azimuthAngleInView:nil];

  UIEventButtonMask nextButtonMask = 0;
  if (uiTouch.phase != UITouchPhaseEnded) {
    nextButtonMask = uiTouch.type == UITouchTypeIndirectPointer ? uiEvent.buttonMask : 1;
  }
  activePointer.button = ButtonMaskDiffToButton(activePointer.buttonMask, nextButtonMask);
  activePointer.buttonMask = nextButtonMask;
  activePointer.modifierFlags = uiEvent.modifierFlags;
#else // [macOS
  NSEventType type = uiTouch.type;
  if (type == NSEventTypeLeftMouseDown || type == NSEventTypeLeftMouseUp || type == NSEventTypeLeftMouseDragged) {
    activePointer.button = 0;
  } else if (type == NSEventTypeRightMouseDown || type == NSEventTypeRightMouseUp || type == NSEventTypeRightMouseDragged) {
    activePointer.button = 2;
  }
  activePointer.modifierFlags = uiEvent.modifierFlags;

#endif // macOS]
}

/**
 * Given an ActivePointer determine if it is still within the same event target tree as
 * the one which initiated the pointer gesture.
 */
static BOOL IsPointerWithinInitialTree(ActivePointer activePointer)
{
  NSOrderedSet<RCTReactTaggedView *> *initialViewSet =
      GetTouchableViewsInPathToRoot(activePointer.initialComponentView);
  for (RCTReactTaggedView *canidateTaggedView in initialViewSet) {
    if (canidateTaggedView.tag == activePointer.componentView.tag) {
      return YES;
    }
  }
  return NO;
}

/**
 * Surprisingly, `__unsafe_unretained id` pointers are not regular pointers
 * and `std::hash<>` cannot hash them.
 * This is quite trivial but decent implementation of hasher function
 * inspired by this research: https://stackoverflow.com/a/21062520/496389.
 */
template <typename PointerT>
struct PointerHasher {
  constexpr std::size_t operator()(const PointerT &value) const
  {
    return reinterpret_cast<size_t>(value);
  }
};

@interface RCTSurfacePointerHandler () <UIGestureRecognizerDelegate>
@end

@implementation RCTSurfacePointerHandler {
#if !TARGET_OS_OSX // [macOS]
  std::unordered_map<__unsafe_unretained RCTUITouch *, ActivePointer, PointerHasher<__unsafe_unretained RCTUITouch *>>
      _activePointers;
#else // [macOS
  std::unordered_map<NSInteger, ActivePointer> _activePointers;
#endif // macOS]

  /*
   * We hold the view weakly to prevent a retain cycle.
   */
  __weak RCTUIView *_rootComponentView; // [macOS]
  RCTIdentifierPool<11> _identifierPool;

#if !TARGET_OS_OSX // [macOS]
  UIHoverGestureRecognizer *_mouseHoverRecognizer API_AVAILABLE(ios(13.0));
  UIHoverGestureRecognizer *_penHoverRecognizer API_AVAILABLE(ios(13.0));
#endif // [macOS]

  NSMutableDictionary<NSNumber *, NSOrderedSet<RCTReactTaggedView *> *> *_currentlyHoveredViewsPerPointer;

  NSInteger _primaryTouchPointerId;
}

- (instancetype)init
{
  if (self = [super initWithTarget:nil action:nil]) {
    // `cancelsTouchesInView` and `delaysTouches*` are needed in order
    // to be used as a top level event delegated recognizer.
    // Otherwise, lower-level components not built using React Native,
    // will fail to recognize gestures.
#if !TARGET_OS_OSX // [macOS]
    self.cancelsTouchesInView = NO;
    self.delaysTouchesBegan = NO; // This is default value.
    self.delaysTouchesEnded = NO;
#endif // [macOS]

    self.delegate = self;

#if !TARGET_OS_OSX // [macOS]
    _mouseHoverRecognizer = nil;
    _penHoverRecognizer = nil;
#endif // [macOS]
    _currentlyHoveredViewsPerPointer = [[NSMutableDictionary alloc] init];
    _primaryTouchPointerId = -1;
  }

  return self;
}

RCT_NOT_IMPLEMENTED(-(instancetype)initWithTarget : (id)target action : (SEL)action)

- (void)attachToView:(RCTUIView *)view // [macOS]
{
  RCTAssert(self.view == nil, @"RCTSurfacePointerHandler already has an attached view.");

  [view addGestureRecognizer:self];
  _rootComponentView = view;

#if !TARGET_OS_OSX // [macOS]
  _mouseHoverRecognizer = [[UIHoverGestureRecognizer alloc] initWithTarget:self action:@selector(mouseHovering:)];
  _mouseHoverRecognizer.allowedTouchTypes = @[ @(UITouchTypeIndirectPointer) ];
  [view addGestureRecognizer:_mouseHoverRecognizer];

  _penHoverRecognizer = [[UIHoverGestureRecognizer alloc] initWithTarget:self action:@selector(penHovering:)];
  _penHoverRecognizer.allowedTouchTypes = @[ @(UITouchTypePencil) ];
  [view addGestureRecognizer:_penHoverRecognizer];
#endif // [macOS]
}

- (void)detachFromView:(RCTUIView *)view // [macOS]
{
  RCTAssertParam(view);
  RCTAssert(self.view == view, @"RCTSufracePointerHandler attached to another view.");

  [view removeGestureRecognizer:self];
  _rootComponentView = nil;

#if !TARGET_OS_OSX // [macOS]
  if (_mouseHoverRecognizer != nil) {
    [view removeGestureRecognizer:_mouseHoverRecognizer];
    _mouseHoverRecognizer = nil;
  }

  if (_penHoverRecognizer != nil) {
    [view removeGestureRecognizer:_penHoverRecognizer];
    _penHoverRecognizer = nil;
  }
#endif
}

#pragma mark - UITouch to ActivePointer management

- (void)_registerTouches:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event // [macOS]
{
  for (RCTUITouch *touch in touches) { // [macOS]
    ActivePointer activePointer = {};

#if !TARGET_OS_OSX // [macOS]
    // Determine the identifier of the Pointer and if it is the primary pointer

    switch (touch.type) {
      case UITouchTypeIndirectPointer:
        activePointer.identifier = kMousePointerId;
        activePointer.isPrimary = true;
        break;
      case UITouchTypePencil:
        activePointer.identifier = kPencilPointerId;
        activePointer.isPrimary = true;
        break;
      default:
        // use the identifier pool offset to ensure no conflicts between the reserved IDs and the
        // touch IDs
        activePointer.identifier = _identifierPool.dequeue() + kTouchIdentifierPoolOffset;
        if (_primaryTouchPointerId == -1) {
          _primaryTouchPointerId = activePointer.identifier;
          activePointer.isPrimary = true;
        }
        break;
    }
#endif // [macOS]
    // If the pointer has not been marked as hovering over views before the touch started, we register
    // that the activeTouch should not maintain its hovered state once the pointer has been lifted.
    auto currentlyHoveredViews = [_currentlyHoveredViewsPerPointer objectForKey:@(activePointer.identifier)];
    if (currentlyHoveredViews == nil || [currentlyHoveredViews count] == 0) {
      activePointer.shouldLeaveWhenReleased = YES;
    }

#if !TARGET_OS_OSX // [macOS]
    activePointer.initialComponentView = FindClosestFabricManagedTouchableView(touch.view);
#else // [macOS
	CGPoint touchLocation = [_rootComponentView.superview convertPoint:touch.locationInWindow fromView:nil];
	RCTPlatformView *componentView = (RCTPlatformView *) [_rootComponentView hitTest:touchLocation];
	activePointer.initialComponentView = FindClosestFabricManagedTouchableView(componentView);
#endif // macOS]

    UpdateActivePointerWithUITouch(activePointer, touch, event, _rootComponentView);

#if !TARGET_OS_OSX // [macOS]
    _activePointers.emplace(touch, activePointer);
#else // [macOS
    _activePointers.emplace(touch.eventNumber, activePointer);
#endif // macOS]
  }
}

- (void)_updateTouches:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event // [macOS]
{
  for (RCTUITouch *touch in touches) { // [macOS]
#if !TARGET_OS_OSX // [macOS]
    auto iterator = _activePointers.find(touch);
#else // [macOS
    auto iterator = _activePointers.find(touch.eventNumber);
#endif // macOS]
    RCTAssert(iterator != _activePointers.end(), @"Inconsistency between local and UIKit touch registries");
    if (iterator == _activePointers.end()) {
      continue;
    }
    UpdateActivePointerWithUITouch(iterator->second, touch, event, _rootComponentView);
  }
}

- (void)_unregisterTouches:(NSSet<RCTUITouch *> *)touches // [macOS]
{
  for (RCTUITouch *touch in touches) { // [macOS]
#if !TARGET_OS_OSX // [macOS]
    auto iterator = _activePointers.find(touch);
#else // [macOS
    auto iterator = _activePointers.find(touch.eventNumber);
#endif // macOS]
    RCTAssert(iterator != _activePointers.end(), @"Inconsistency between local and UIKit touch registries");
    if (iterator == _activePointers.end()) {
      continue;
    }
    auto &activePointer = iterator->second;

    if (activePointer.identifier == _primaryTouchPointerId) {
      _primaryTouchPointerId = -1;
    }

#if !TARGET_OS_OSX // [macOS]
    // only need to enqueue if the touch type isn't one with a reserved identifier
    switch (touch.type) {
      case UITouchTypeIndirectPointer:
      case UITouchTypePencil:
        break;
      default:
        // since the touch's identifier has been offset we need to re-normalize it to 0-based
        // which is what the identifier pool expects
        _identifierPool.enqueue(activePointer.identifier - kTouchIdentifierPoolOffset);
    }

    _activePointers.erase(touch);
#else // [macOS
    _activePointers.erase(touch.eventNumber);
#endif // macOS]
  }
}

- (std::vector<ActivePointer>)_activePointersFromTouches:(NSSet<RCTUITouch *> *)touches // [macOS]
{
  std::vector<ActivePointer> activePointers;
  activePointers.reserve(touches.count);

  for (RCTUITouch *touch in touches) { // [macOS]
#if !TARGET_OS_OSX // [macOS]
    auto iterator = _activePointers.find(touch);
#else // [macOS
    auto iterator = _activePointers.find(touch.eventNumber);
#endif // macOS]
    RCTAssert(iterator != _activePointers.end(), @"Inconsistency between local and UIKit touch registries");
    if (iterator == _activePointers.end()) {
      continue;
    }
    activePointers.push_back(iterator->second);
  }

  return activePointers;
}

- (void)_dispatchActivePointers:(std::vector<ActivePointer>)activePointers eventType:(RCTPointerEventType)eventType
{
#if !TARGET_OS_OSX // [macOS]
  for (const auto &activePointer : activePointers) {
    PointerEvent pointerEvent = CreatePointerEventFromActivePointer(activePointer, eventType, _rootComponentView);
    [self handleIncomingPointerEvent:pointerEvent onView:activePointer.componentView];

    SharedTouchEventEmitter eventEmitter = GetTouchEmitterFromView(
        activePointer.componentView,
        [_rootComponentView convertPoint:activePointer.clientPoint toView:activePointer.componentView]);

    if (eventEmitter != nil) {
      switch (eventType) {
        case RCTPointerEventTypeStart: {
          eventEmitter->onPointerDown(pointerEvent);
          break;
        }
        case RCTPointerEventTypeMove: {
          eventEmitter->onPointerMove(pointerEvent);
          break;
        }
        case RCTPointerEventTypeEnd: {
          eventEmitter->onPointerUp(pointerEvent);

          if (pointerEvent.isPrimary && pointerEvent.button == 0 && IsPointerWithinInitialTree(activePointer)) {
            eventEmitter->onClick(pointerEvent);
          }

          if (activePointer.shouldLeaveWhenReleased) {
            [self handleIncomingPointerEvent:pointerEvent onView:nil];
          }
          break;
        }
        case RCTPointerEventTypeCancel: {
          eventEmitter->onPointerCancel(pointerEvent);
          [self handleIncomingPointerEvent:pointerEvent onView:nil];
          break;
        }
      }
    }
  }
#endif // [macOS]
}

#pragma mark - `UIResponder`-ish touch-delivery methods

#if !TARGET_OS_OSX // [macOS]
- (void)touchesBegan:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event // [macOS]
{
  [super touchesBegan:touches withEvent:event];

  [self _registerTouches:touches withEvent:event];
  [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeStart];

  if (self.state == UIGestureRecognizerStatePossible) {
    self.state = UIGestureRecognizerStateBegan;
  } else if (self.state == UIGestureRecognizerStateBegan) {
    self.state = UIGestureRecognizerStateChanged;
  }
}

- (void)touchesMoved:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event // [macOS]
{
  [super touchesMoved:touches withEvent:event];

  [self _updateTouches:touches withEvent:event];
  [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeMove];

  self.state = UIGestureRecognizerStateChanged;
}

- (void)touchesEnded:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event // [macOS]
{
  [super touchesEnded:touches withEvent:event];

  [self _updateTouches:touches withEvent:event];
  [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeEnd];
  [self _unregisterTouches:touches];

  if (AllTouchesAreCancelledOrEnded(event.allTouches)) {
    self.state = UIGestureRecognizerStateEnded;
  } else if (AnyTouchesChanged(event.allTouches)) {
    self.state = UIGestureRecognizerStateChanged;
  }
}

- (void)touchesCancelled:(NSSet<RCTUITouch *> *)touches withEvent:(UIEvent *)event // [macOS]
{
  [super touchesCancelled:touches withEvent:event];

  [self _updateTouches:touches withEvent:event];
  [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeCancel];
  [self _unregisterTouches:touches];

  if (AllTouchesAreCancelledOrEnded(event.allTouches)) {
    self.state = UIGestureRecognizerStateCancelled;
  } else if (AnyTouchesChanged(event.allTouches)) {
    self.state = UIGestureRecognizerStateChanged;
  }
}
#else // [macOS
- (BOOL)acceptsFirstMouse:(NSEvent *)event
{
  // This will only be called if the hit-tested view returns YES for acceptsFirstMouse,
  // therefore asking it again would be redundant.
  return YES;
}

- (void)mouseDown:(NSEvent *)event
{
  [super mouseDown:event];

  {
    NSSet* touches = [NSSet setWithObject:event];
    [self _registerTouches:touches withEvent:event]; // [macOS]
      [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeStart];

    if (self.state == NSGestureRecognizerStatePossible) {
      self.state = NSGestureRecognizerStateBegan;
    } else if (self.state == NSGestureRecognizerStateBegan) {
      self.state = NSGestureRecognizerStateChanged;
    }
  }
}

- (void)rightMouseDown:(NSEvent *)event
{
  [super rightMouseDown:event];

  {
    NSSet* touches = [NSSet setWithObject:event];
        [self _registerTouches:touches withEvent:event]; // [macOS]
      [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeStart];

    if (self.state == NSGestureRecognizerStatePossible) {
      self.state = NSGestureRecognizerStateBegan;
    } else if (self.state == NSGestureRecognizerStateBegan) {
      self.state = NSGestureRecognizerStateChanged;
    }
  }
}

- (void)mouseDragged:(NSEvent *)event
{
  [super mouseDragged:event];

  NSSet* touches = [NSSet setWithObject:event];
  [self _updateTouches:touches withEvent:event]; // [macOS]
    [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeMove];

  self.state = NSGestureRecognizerStateChanged;
}

- (void)rightMouseDragged:(NSEvent *)event
{
  [super rightMouseDragged:event];

  NSSet* touches = [NSSet setWithObject:event];
  [self _updateTouches:touches withEvent:event]; // [macOS]
    [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeMove];

  self.state = NSGestureRecognizerStateChanged;
}

- (void)mouseUp:(NSEvent *)event
{
  [super mouseUp:event];

  NSSet* touches = [NSSet setWithObject:event];
  [self _updateTouches:touches withEvent:event]; // [macOS]
    [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeEnd];
  [self _unregisterTouches:touches];

  self.state = NSGestureRecognizerStateEnded;
}

- (void)rightMouseUp:(NSEvent *)event
{
  [super rightMouseUp:event];

  NSSet* touches = [NSSet setWithObject:event];
  [self _updateTouches:touches withEvent:event]; // [macOS]
    [self _dispatchActivePointers:[self _activePointersFromTouches:touches] eventType:RCTPointerEventTypeEnd];
  [self _unregisterTouches:touches];

  self.state = NSGestureRecognizerStateEnded;
}
#endif // macOS]

- (void)reset
{
  [super reset];

  if (!_activePointers.empty()) {
    std::vector<ActivePointer> activePointers;
    activePointers.reserve(_activePointers.size());

    for (const auto &pair : _activePointers) {
      activePointers.push_back(pair.second);
    }

    [self _dispatchActivePointers:activePointers eventType:RCTPointerEventTypeCancel];

    // Force-unregistering all the pointers
    _activePointers.clear();
    _identifierPool.reset();
  }
}

- (BOOL)canPreventGestureRecognizer:(UIGestureRecognizer *)preventedGestureRecognizer
{
  return NO;
}

#pragma mark - Hover callbacks

#if !TARGET_OS_OSX // [macOS]
- (void)penHovering:(UIHoverGestureRecognizer *)recognizer API_AVAILABLE(ios(13.0))
{
  [self hovering:recognizer pointerId:kPencilPointerId pointerType:"pen"];
}

- (void)mouseHovering:(UIHoverGestureRecognizer *)recognizer API_AVAILABLE(ios(13.0))
{
  [self hovering:recognizer pointerId:kMousePointerId pointerType:"mouse"];
}

- (void)hovering:(UIHoverGestureRecognizer *)recognizer
       pointerId:(int)pointerId
     pointerType:(std::string)pointerType API_AVAILABLE(ios(13.0))
{
  UIView *listenerView = recognizer.view;
  CGPoint clientLocation = [recognizer locationInView:listenerView];
#if !TARGET_OS_VISION // [visionOS]
  CGPoint screenLocation = [listenerView convertPoint:clientLocation
                                    toCoordinateSpace:listenerView.window.screen.coordinateSpace];
#else // [visionOS
  CGPoint screenLocation = CGPointZero;
#endif // visionOS]
  UIView *targetView = [listenerView hitTest:clientLocation withEvent:nil];
  targetView = FindClosestFabricManagedTouchableView(targetView);

  CGPoint offsetLocation = [recognizer locationInView:targetView];

  UIKeyModifierFlags modifierFlags;

  modifierFlags = recognizer.modifierFlags;

  PointerEvent event = CreatePointerEventFromIncompleteHoverData(
      pointerId, pointerType, clientLocation, screenLocation, offsetLocation, modifierFlags);

  [self handleIncomingPointerEvent:event onView:targetView];
  SharedTouchEventEmitter eventEmitter = GetTouchEmitterFromView(targetView, offsetLocation);
  if (eventEmitter != nil) {
    eventEmitter->onPointerMove(event);
  }
}
#endif // [macOS]

#pragma mark - Shared pointer handlers

#if !TARGET_OS_OSX // [macOS]
/**
 * Private method which is used for tracking the location of pointer events to manage the entering/leaving events.
 * The primary idea is that a pointer's presence & movement is dicated by a variety of underlying events such as down,
 * move, and up — and they should all be treated the same when it comes to tracking the entering & leaving of pointers
 * to views. This method accomplishes that by receiving the pointer event, the target view (can be null in cases when
 * the event indicates that the pointer has left the screen entirely), and a block/callback where the underlying event
 * should be fired.
 */
- (NSOrderedSet<RCTReactTaggedView *> *)handleIncomingPointerEvent:(PointerEvent)event
                                                            onView:(nullable UIView *)targetView
{
  NSInteger pointerId = event.pointerId;
  CGPoint clientLocation = CGPointMake(event.clientPoint.x, event.clientPoint.y);

  NSOrderedSet<RCTReactTaggedView *> *currentlyHoveredViews =
      [_currentlyHoveredViewsPerPointer objectForKey:@(pointerId)];
  if (currentlyHoveredViews == nil) {
    currentlyHoveredViews = [NSOrderedSet orderedSet];
  }

  RCTReactTaggedView *targetTaggedView = [RCTReactTaggedView wrap:targetView];
  RCTReactTaggedView *prevTargetTaggedView = [currentlyHoveredViews firstObject];
  UIView *prevTargetView = prevTargetTaggedView.view;

  NSOrderedSet<RCTReactTaggedView *> *eventPathViews = GetTouchableViewsInPathToRoot(targetView);

  // Out
  if (prevTargetView != nil && prevTargetTaggedView.tag != targetTaggedView.tag) {
    SharedTouchEventEmitter eventEmitter =
        GetTouchEmitterFromView(prevTargetView, [_rootComponentView convertPoint:clientLocation toView:prevTargetView]);
    if (eventEmitter != nil) {
      eventEmitter->onPointerOut(event);
    }
  }

  // Leaving

  // pointerleave events need to be emitted from the deepest target to the root but
  // we also need to efficiently keep track of if a view has a parent which is listening to the leave events,
  // so we first iterate from the root to the target, collecting the views which need events fired for, of which
  // we reverse iterate (now from target to root), actually emitting the events.
  NSMutableOrderedSet<UIView *> *viewsToEmitLeaveEventsTo = [NSMutableOrderedSet orderedSet];

  for (RCTReactTaggedView *taggedView in [currentlyHoveredViews reverseObjectEnumerator]) {
    UIView *componentView = taggedView.view;

    BOOL shouldEmitEvent = componentView != nil;

    if (shouldEmitEvent && ![eventPathViews containsObject:taggedView]) {
      [viewsToEmitLeaveEventsTo addObject:componentView];
    }
  }

  for (UIView *componentView in [viewsToEmitLeaveEventsTo reverseObjectEnumerator]) {
    SharedTouchEventEmitter eventEmitter =
        GetTouchEmitterFromView(componentView, [_rootComponentView convertPoint:clientLocation toView:componentView]);
    if (eventEmitter != nil) {
      eventEmitter->onPointerLeave(event);
    }
  }

  // Over
  if (targetView != nil && prevTargetTaggedView.tag != targetTaggedView.tag) {
    SharedTouchEventEmitter eventEmitter =
        GetTouchEmitterFromView(targetView, [_rootComponentView convertPoint:clientLocation toView:targetView]);
    if (eventEmitter != nil) {
      eventEmitter->onPointerOver(event);
    }
  }

  // Entering

  // We only want to emit events to JS if there is a view that is currently listening to said event
  // so we only send those event to the JS side if the element which has been entered is itself listening,
  // or if one of its parents is listening in case those listeners care about the capturing phase. Adding the ability
  // for native to distinguish between capturing listeners and not could be an optimization to further reduce the number
  // of events we send to JS
  for (RCTReactTaggedView *taggedView in [eventPathViews reverseObjectEnumerator]) {
    UIView *componentView = taggedView.view;

    BOOL shouldEmitEvent = componentView != nil;

    if (shouldEmitEvent && ![currentlyHoveredViews containsObject:taggedView]) {
      SharedTouchEventEmitter eventEmitter =
          GetTouchEmitterFromView(componentView, [_rootComponentView convertPoint:clientLocation toView:componentView]);
      if (eventEmitter != nil) {
        eventEmitter->onPointerEnter(event);
      }
    }
  }

  [_currentlyHoveredViewsPerPointer setObject:eventPathViews forKey:@(pointerId)];

  return eventPathViews;
}
#endif // [macOS]

@end
