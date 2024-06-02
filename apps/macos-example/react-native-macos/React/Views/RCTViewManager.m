/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTViewManager.h"

#import "RCTAssert.h"
#import "RCTBorderCurve.h"
#import "RCTBorderStyle.h"
#import "RCTBridge.h"
#import "RCTConvert+Transform.h"
#import "RCTConvert.h"
#import "RCTCursor.h" // [macOS] [visionOS]
#import "RCTLog.h"
#import "RCTShadowView.h"
#import "RCTTransformOrigin.h"
#import "RCTUIManager.h"
#import "RCTUIManagerUtils.h"
#import "RCTUtils.h"
#import "RCTView.h"
#import "UIView+React.h"

@implementation RCTConvert (UIAccessibilityTraits)

#if !TARGET_OS_OSX // [macOS]
RCT_MULTI_ENUM_CONVERTER(
    UIAccessibilityTraits,
    (@{
      @"adjustable" : @(UIAccessibilityTraitAdjustable),
      @"alert" : @(UIAccessibilityTraitNone),
      @"alertdialog" : @(UIAccessibilityTraitNone),
      @"allowsDirectInteraction" : @(UIAccessibilityTraitAllowsDirectInteraction),
      @"application" : @(UIAccessibilityTraitNone),
      @"article" : @(UIAccessibilityTraitNone),
      @"banner" : @(UIAccessibilityTraitNone),
      @"button" : @(UIAccessibilityTraitButton),
      @"cell" : @(UIAccessibilityTraitNone),
      @"checkbox" : @(UIAccessibilityTraitNone),
      @"columnheader" : @(UIAccessibilityTraitNone),
      @"combobox" : @(UIAccessibilityTraitNone),
      @"complementary" : @(UIAccessibilityTraitNone),
      @"contentinfo" : @(UIAccessibilityTraitNone),
      @"definition" : @(UIAccessibilityTraitNone),
      @"dialog" : @(UIAccessibilityTraitNone),
      @"directory" : @(UIAccessibilityTraitNone),
      @"disabled" : @(UIAccessibilityTraitNotEnabled),
      @"document" : @(UIAccessibilityTraitNone),
      @"drawerlayout" : @(UIAccessibilityTraitNone),
      @"dropdownlist" : @(UIAccessibilityTraitNone),
      @"feed" : @(UIAccessibilityTraitNone),
      @"figure" : @(UIAccessibilityTraitNone),
      @"form" : @(UIAccessibilityTraitNone),
      @"frequentUpdates" : @(UIAccessibilityTraitUpdatesFrequently),
      @"grid" : @(UIAccessibilityTraitNone),
      @"group" : @(UIAccessibilityTraitNone),
      @"header" : @(UIAccessibilityTraitHeader),
      @"heading" : @(UIAccessibilityTraitHeader),
      @"horizontalscrollview" : @(UIAccessibilityTraitNone),
      @"iconmenu" : @(UIAccessibilityTraitNone),
      @"image" : @(UIAccessibilityTraitImage),
      @"imagebutton" : @(UIAccessibilityTraitImage | UIAccessibilityTraitButton),
      @"img" : @(UIAccessibilityTraitImage),
      @"key" : @(UIAccessibilityTraitKeyboardKey),
      @"keyboardkey" : @(UIAccessibilityTraitKeyboardKey),
      @"link" : @(UIAccessibilityTraitLink),
      @"list" : @(UIAccessibilityTraitNone),
      @"listitem" : @(UIAccessibilityTraitNone),
      @"log" : @(UIAccessibilityTraitNone),
      @"main" : @(UIAccessibilityTraitNone),
      @"marquee" : @(UIAccessibilityTraitNone),
      @"math" : @(UIAccessibilityTraitNone),
      @"menu" : @(UIAccessibilityTraitNone),
      @"menubar" : @(UIAccessibilityTraitNone),
      @"menuitem" : @(UIAccessibilityTraitNone),
      @"meter" : @(UIAccessibilityTraitNone),
      @"navigation" : @(UIAccessibilityTraitNone),
      @"none" : @(UIAccessibilityTraitNone),
      @"note" : @(UIAccessibilityTraitNone),
      @"option" : @(UIAccessibilityTraitNone),
      @"pager" : @(UIAccessibilityTraitNone),
      @"pageTurn" : @(UIAccessibilityTraitCausesPageTurn),
      @"plays" : @(UIAccessibilityTraitPlaysSound),
      @"presentation" : @(UIAccessibilityTraitNone),
      @"progressbar" : @(UIAccessibilityTraitUpdatesFrequently),
      @"radio" : @(UIAccessibilityTraitNone),
      @"radiogroup" : @(UIAccessibilityTraitNone),
      @"region" : @(UIAccessibilityTraitNone),
      @"row" : @(UIAccessibilityTraitNone),
      @"rowgroup" : @(UIAccessibilityTraitNone),
      @"rowheader" : @(UIAccessibilityTraitNone),
      @"scrollbar" : @(UIAccessibilityTraitNone),
      @"scrollview" : @(UIAccessibilityTraitNone),
      @"search" : @(UIAccessibilityTraitSearchField),
      @"searchbox" : @(UIAccessibilityTraitSearchField),
      @"selected" : @(UIAccessibilityTraitSelected),
      @"separator" : @(UIAccessibilityTraitNone),
      @"slider" : @(UIAccessibilityTraitNone),
      @"slidingdrawer" : @(UIAccessibilityTraitNone),
      @"spinbutton" : @(UIAccessibilityTraitNone),
      @"startsMedia" : @(UIAccessibilityTraitStartsMediaSession),
      @"status" : @(UIAccessibilityTraitNone),
      @"summary" : @(UIAccessibilityTraitSummaryElement),
      @"switch" : @(SwitchAccessibilityTrait),
      @"tab" : @(UIAccessibilityTraitNone),
      @"tabbar" : @(UIAccessibilityTraitTabBar),
      @"table" : @(UIAccessibilityTraitNone),
      @"tablist" : @(UIAccessibilityTraitNone),
      @"tabpanel" : @(UIAccessibilityTraitNone),
      @"term" : @(UIAccessibilityTraitNone),
      @"text" : @(UIAccessibilityTraitStaticText),
      @"timer" : @(UIAccessibilityTraitNone),
      @"togglebutton" : @(UIAccessibilityTraitButton),
      @"toolbar" : @(UIAccessibilityTraitNone),
      @"tooltip" : @(UIAccessibilityTraitNone),
      @"tree" : @(UIAccessibilityTraitNone),
      @"treegrid" : @(UIAccessibilityTraitNone),
      @"treeitem" : @(UIAccessibilityTraitNone),
      @"viewgroup" : @(UIAccessibilityTraitNone),
      @"webview" : @(UIAccessibilityTraitNone),
      // [macOS a set of RN accessibilityTraits are macOS specific accessiblity roles and map to nothing on iOS
      @"disclosure" : @(UIAccessibilityTraitNone),
      @"group" : @(UIAccessibilityTraitNone),
      @"table": @(UIAccessibilityTraitNone),
      // macOS]
    }),
    UIAccessibilityTraitNone,
    unsignedLongLongValue)
#endif // [macOS]

+ (RCTTransformOrigin)RCTTransformOrigin:(id)json
{
  RCTTransformOrigin transformOrigin = {
      [RCTConvert YGValue:json[0]], [RCTConvert YGValue:json[1]], [RCTConvert CGFloat:json[2]]};
  return transformOrigin;
}

@end

@implementation RCTViewManager

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE()

- (dispatch_queue_t)methodQueue
{
  return RCTGetUIManagerQueue();
}

- (void)setBridge:(RCTBridge *)bridge
{
  RCTErrorNewArchitectureValidation(
      RCTNotAllowedInBridgeless, self, @"RCTViewManager must not be initialized for the new architecture");
  _bridge = bridge;
}

- (RCTPlatformView *)view // [macOS]
{
  return [[RCTView alloc] initWithEventDispatcher:self.bridge.eventDispatcher]; // [macOS]
}

- (RCTShadowView *)shadowView
{
  return [RCTShadowView new];
}

- (NSArray<NSString *> *)customBubblingEventTypes
{
  return @[

    // Generic events
    @"press",
    @"change",
    @"focus",
    @"blur",
    @"submitEditing",
    @"endEditing",
    @"keyPress",

    // Touch events
    @"touchStart",
    @"touchMove",
    @"touchCancel",
    @"touchEnd",
  ];
}

#if TARGET_OS_OSX // [macOS
RCT_EXPORT_METHOD(focus : (nonnull NSNumber *)viewTag)
{
  [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTUIView *> *viewRegistry) {
    RCTUIView *view = viewRegistry[viewTag];
    [view reactFocus];
  }];
}

RCT_EXPORT_METHOD(blur : (nonnull NSNumber *)viewTag)
{
  [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, RCTUIView *> *viewRegistry) {
    RCTUIView *view = viewRegistry[viewTag];
    [view reactBlur];
  }];
}
#endif // macOS]

#pragma mark - View properties

// Accessibility related properties
#if !TARGET_OS_OSX // [macOS]
RCT_REMAP_VIEW_PROPERTY(accessible, reactAccessibilityElement.isAccessibilityElement, BOOL)
#else // [macOS
RCT_REMAP_VIEW_PROPERTY(accessible, reactAccessibilityElement.accessibilityElement, BOOL)
#endif // macOS]
RCT_REMAP_VIEW_PROPERTY(accessibilityActions, reactAccessibilityElement.accessibilityActions, NSDictionaryArray)
RCT_REMAP_VIEW_PROPERTY(accessibilityLabel, reactAccessibilityElement.accessibilityLabel, NSString)
#if !TARGET_OS_OSX // [macOS]
RCT_REMAP_VIEW_PROPERTY(accessibilityHint, reactAccessibilityElement.accessibilityHint, NSString)
#else // [macOS
RCT_REMAP_VIEW_PROPERTY(accessibilityHint, reactAccessibilityElement.accessibilityHelp, NSString)
#endif // macOS]
RCT_REMAP_VIEW_PROPERTY(accessibilityLanguage, reactAccessibilityElement.accessibilityLanguage, NSString)
RCT_REMAP_VIEW_PROPERTY(accessibilityValue, reactAccessibilityElement.accessibilityValueInternal, NSDictionary)
#if !TARGET_OS_OSX // [macOS]
RCT_REMAP_VIEW_PROPERTY(accessibilityViewIsModal, reactAccessibilityElement.accessibilityViewIsModal, BOOL)
RCT_REMAP_VIEW_PROPERTY(accessibilityElementsHidden, reactAccessibilityElement.accessibilityElementsHidden, BOOL)
RCT_REMAP_VIEW_PROPERTY(
    accessibilityIgnoresInvertColors,
    reactAccessibilityElement.shouldAccessibilityIgnoresInvertColors,
    BOOL)
#endif // [macOS]
RCT_REMAP_VIEW_PROPERTY(onAccessibilityAction, reactAccessibilityElement.onAccessibilityAction, RCTDirectEventBlock)
RCT_REMAP_VIEW_PROPERTY(onAccessibilityTap, reactAccessibilityElement.onAccessibilityTap, RCTDirectEventBlock)
#if !TARGET_OS_OSX // [macOS]
RCT_REMAP_VIEW_PROPERTY(onMagicTap, reactAccessibilityElement.onMagicTap, RCTDirectEventBlock)
#else // [macOS accessibilityTraits is gone in react-native and deprecated in react-native-macos, use accessibilityRole instead
RCT_CUSTOM_VIEW_PROPERTY(accessibilityTraits, NSString, RCTView)
{
  view.reactAccessibilityElement.accessibilityRoleInternal = json ? [RCTConvert accessibilityRoleFromTraits:json useAriaMappings:NO] : nil;
  if (view.reactAccessibilityElement.accessibilityRole != view.reactAccessibilityElement.accessibilityRoleInternal) {
    [self updateAccessibilityRole:view withDefaultView:defaultView];
  }
}
#endif // macOS]
RCT_REMAP_VIEW_PROPERTY(onAccessibilityEscape, reactAccessibilityElement.onAccessibilityEscape, RCTDirectEventBlock)
RCT_REMAP_VIEW_PROPERTY(testID, reactAccessibilityElement.accessibilityIdentifier, NSString)

RCT_EXPORT_VIEW_PROPERTY(backgroundColor, UIColor)
RCT_REMAP_VIEW_PROPERTY(backfaceVisibility, layer.doubleSided, css_backface_visibility_t)
RCT_EXPORT_VIEW_PROPERTY(cursor, RCTCursor) // [visionOS]
#if !TARGET_OS_OSX // [macOS]
RCT_REMAP_VIEW_PROPERTY(opacity, alpha, CGFloat)
#else // [macOS
RCT_REMAP_VIEW_PROPERTY(opacity, alphaValue, CGFloat)
#endif // macOS]

#if !TARGET_OS_OSX // [macOS]
RCT_REMAP_VIEW_PROPERTY(shadowColor, layer.shadowColor, CGColor)
RCT_REMAP_VIEW_PROPERTY(shadowOffset, layer.shadowOffset, CGSize)
RCT_REMAP_VIEW_PROPERTY(shadowOpacity, layer.shadowOpacity, float)
RCT_REMAP_VIEW_PROPERTY(shadowRadius, layer.shadowRadius, CGFloat)
#else // [macOS
RCT_EXPORT_VIEW_PROPERTY(shadowColor, NSColor)
RCT_EXPORT_VIEW_PROPERTY(shadowOffset, CGSize)
RCT_EXPORT_VIEW_PROPERTY(shadowOpacity, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(shadowRadius, CGFloat)
#endif // macOS]

RCT_REMAP_VIEW_PROPERTY(needsOffscreenAlphaCompositing, layer.allowsGroupOpacity, BOOL)
RCT_CUSTOM_VIEW_PROPERTY(overflow, YGOverflow, RCTView)
{
  if (json) {
    view.clipsToBounds = [RCTConvert YGOverflow:json] != YGOverflowVisible;
  } else {
    view.clipsToBounds = defaultView.clipsToBounds;
  }
}
#if !TARGET_OS_OSX // [macOS]
RCT_CUSTOM_VIEW_PROPERTY(shouldRasterizeIOS, BOOL, RCTView)
{
  view.layer.shouldRasterize = json ? [RCTConvert BOOL:json] : defaultView.layer.shouldRasterize;
  view.layer.rasterizationScale =
      view.layer.shouldRasterize ? view.traitCollection.displayScale : defaultView.layer.rasterizationScale;
}
#endif // [macOS]

RCT_REMAP_VIEW_PROPERTY(transform, reactTransform, CATransform3D)
RCT_REMAP_VIEW_PROPERTY(transformOrigin, reactTransformOrigin, RCTTransformOrigin)

RCT_CUSTOM_VIEW_PROPERTY(accessibilityRole, UIAccessibilityTraits, RCTView)
{
#if !TARGET_OS_OSX // [macOS]
  UIAccessibilityTraits accessibilityRoleTraits =
      json ? [RCTConvert UIAccessibilityTraits:json] : UIAccessibilityTraitNone;
  if (view.reactAccessibilityElement.accessibilityRoleTraits != accessibilityRoleTraits) {
    view.accessibilityRoleTraits = accessibilityRoleTraits;
    view.reactAccessibilityElement.accessibilityRole = json ? [RCTConvert NSString:json] : nil;
    [self updateAccessibilityTraitsForRole:view withDefaultView:defaultView];
  }
#else // [macOS
  // accessibilityRoleInternal is used to cache the converted value from the prop
  view.reactAccessibilityElement.accessibilityRoleInternal = json ? [RCTConvert accessibilityRoleFromTraits:json useAriaMappings:NO] : nil;
  // update the actual NSAccessibilityRole if it doesn't match
  if (view.reactAccessibilityElement.accessibilityRole != view.reactAccessibilityElement.accessibilityRoleInternal) {
    [self updateAccessibilityRole:view withDefaultView:defaultView];
  }
#endif // macOS]
}

RCT_CUSTOM_VIEW_PROPERTY(role, UIAccessibilityTraits, RCTView)
{
#if !TARGET_OS_OSX // [macOS]
  UIAccessibilityTraits roleTraits = json ? [RCTConvert UIAccessibilityTraits:json] : UIAccessibilityTraitNone;
  if (view.reactAccessibilityElement.roleTraits != roleTraits) {
    view.roleTraits = roleTraits;
    view.reactAccessibilityElement.role = json ? [RCTConvert NSString:json] : nil;
    [self updateAccessibilityTraitsForRole:view withDefaultView:defaultView];
  }
#else // [macOS
  // role is used to cache the converted value from the prop
  view.reactAccessibilityElement.role = json ? [RCTConvert accessibilityRoleFromTraits:json useAriaMappings:YES] : nil;
  // update the actual NSAccessibilityRole if it doesn't match
  if (view.reactAccessibilityElement.accessibilityRole != view.reactAccessibilityElement.role) {
    [self updateAccessibilityRole:view withDefaultView:defaultView];
  }
#endif // macOS]
}

#if !TARGET_OS_OSX // [macOS]
- (void)updateAccessibilityTraitsForRole:(RCTView *)view withDefaultView:(RCTView *)defaultView
{
  const UIAccessibilityTraits AccessibilityRolesMask = UIAccessibilityTraitNone | UIAccessibilityTraitButton |
      UIAccessibilityTraitLink | UIAccessibilityTraitSearchField | UIAccessibilityTraitImage |
      UIAccessibilityTraitKeyboardKey | UIAccessibilityTraitStaticText | UIAccessibilityTraitAdjustable |
      UIAccessibilityTraitHeader | UIAccessibilityTraitSummaryElement | UIAccessibilityTraitTabBar |
      UIAccessibilityTraitUpdatesFrequently | SwitchAccessibilityTrait;

  // Clear any existing traits set for AccessibilityRole
  view.reactAccessibilityElement.accessibilityTraits &= ~(AccessibilityRolesMask);

  view.reactAccessibilityElement.accessibilityTraits |= view.reactAccessibilityElement.role
      ? view.reactAccessibilityElement.roleTraits
      : view.reactAccessibilityElement.accessibilityRole ? view.reactAccessibilityElement.accessibilityRoleTraits
                                                         : (defaultView.accessibilityTraits & AccessibilityRolesMask);                        
}
#else // [macOS
- (void) updateAccessibilityRole:(RCTView *)view withDefaultView:(RCTView *)defaultView
{
  // First check the value from `role`
  view.reactAccessibilityElement.accessibilityRole = view.reactAccessibilityElement.role ? view.reactAccessibilityElement.role : nil;
  // Fallback to `accessibilityRole` if nil, or the defaultView's NSAccessibilityRole
  if (view.reactAccessibilityElement.accessibilityRole == nil) {
    view.reactAccessibilityElement.accessibilityRole = view.reactAccessibilityElement.accessibilityRoleInternal ? view.reactAccessibilityElement.accessibilityRoleInternal : defaultView.accessibilityRole;
  }
}
#endif // macOS]

RCT_CUSTOM_VIEW_PROPERTY(accessibilityState, NSDictionary, RCTView)
{
  NSDictionary<NSString *, id> *state = json ? [RCTConvert NSDictionary:json] : nil;
  NSMutableDictionary<NSString *, id> *newState = [NSMutableDictionary<NSString *, id> new];

  if (!state) {
    return;
  }

#if !TARGET_OS_OSX // [macOS]
  const UIAccessibilityTraits AccessibilityStatesMask = UIAccessibilityTraitNotEnabled | UIAccessibilityTraitSelected;
  view.reactAccessibilityElement.accessibilityTraits =
      view.reactAccessibilityElement.accessibilityTraits & ~AccessibilityStatesMask;

  for (NSString *s in state) {
    id val = [state objectForKey:s];
    if (!val) {
      continue;
    }
    if ([s isEqualToString:@"selected"] && [val isKindOfClass:[NSNumber class]] && [val boolValue]) {
      view.reactAccessibilityElement.accessibilityTraits |= UIAccessibilityTraitSelected;
    } else if ([s isEqualToString:@"disabled"] && [val isKindOfClass:[NSNumber class]] && [val boolValue]) {
      view.reactAccessibilityElement.accessibilityTraits |= UIAccessibilityTraitNotEnabled;
    } else {
      newState[s] = val;
    }
  }
#else // [macOS
  for (NSString *s in state) {
    id val = [state objectForKey:s];
    if (val == nil) {
      continue;
    }
    newState[s] = val;
  }
#endif // macOS]
  if (newState.count > 0) {
    view.reactAccessibilityElement.accessibilityState = newState;
  } else {
    view.reactAccessibilityElement.accessibilityState = nil;
  }
}

RCT_CUSTOM_VIEW_PROPERTY(nativeID, NSString *, RCTView)
{
  view.nativeID = json ? [RCTConvert NSString:json] : defaultView.nativeID;
  [_bridge.uiManager setNativeID:view.nativeID forView:view];
}

RCT_CUSTOM_VIEW_PROPERTY(pointerEvents, RCTPointerEvents, RCTView)
{
  if ([view respondsToSelector:@selector(setPointerEvents:)]) {
    view.pointerEvents = json ? [RCTConvert RCTPointerEvents:json] : defaultView.pointerEvents;
    return;
  }

  if (!json) {
    view.userInteractionEnabled = defaultView.userInteractionEnabled;
    return;
  }

  switch ([RCTConvert RCTPointerEvents:json]) {
    case RCTPointerEventsUnspecified:
      // Pointer events "unspecified" acts as if a stylesheet had not specified,
      // which is different than "auto" in CSS (which cannot and will not be
      // supported in `React`. "auto" may override a parent's "none".
      // Unspecified values do not.
      // This wouldn't override a container view's `userInteractionEnabled = NO`
      view.userInteractionEnabled = YES;
    case RCTPointerEventsNone:
      view.userInteractionEnabled = NO;
      break;
    default:
      RCTLogInfo(@"UIView base class does not support pointerEvent value: %@", json);
  }
}
RCT_CUSTOM_VIEW_PROPERTY(removeClippedSubviews, BOOL, RCTView)
{
  if ([view respondsToSelector:@selector(setRemoveClippedSubviews:)]) {
    view.removeClippedSubviews = json ? [RCTConvert BOOL:json] : defaultView.removeClippedSubviews;
  }
}
RCT_CUSTOM_VIEW_PROPERTY(borderCurve, RCTBorderCurve, RCTView)
{
  switch ([RCTConvert RCTBorderCurve:json]) {
    case RCTBorderCurveContinuous:
      view.layer.cornerCurve = kCACornerCurveContinuous;
      break;
    case RCTBorderCurveCircular:
      view.layer.cornerCurve = kCACornerCurveCircular;
      break;
  }
}
RCT_CUSTOM_VIEW_PROPERTY(borderRadius, CGFloat, RCTView)
{
  if ([view respondsToSelector:@selector(setBorderRadius:)]) {
    view.borderRadius = json ? [RCTConvert CGFloat:json] : defaultView.borderRadius;
  } else {
    view.layer.cornerRadius = json ? [RCTConvert CGFloat:json] : defaultView.layer.cornerRadius;
  }
}
RCT_CUSTOM_VIEW_PROPERTY(borderColor, UIColor, RCTView)
{
  if ([view respondsToSelector:@selector(setBorderColor:)]) {
    view.borderColor = json ? [RCTConvert UIColor:json] : defaultView.borderColor;
  } else {
    view.layer.borderColor = json ? [RCTConvert CGColor:json] : defaultView.layer.borderColor;
  }
}
RCT_CUSTOM_VIEW_PROPERTY(borderWidth, float, RCTView)
{
  if ([view respondsToSelector:@selector(setBorderWidth:)]) {
    view.borderWidth = json ? [RCTConvert CGFloat:json] : defaultView.borderWidth;
  } else {
    view.layer.borderWidth = json ? [RCTConvert CGFloat:json] : defaultView.layer.borderWidth;
  }
}
RCT_CUSTOM_VIEW_PROPERTY(borderStyle, RCTBorderStyle, RCTView)
{
  if ([view respondsToSelector:@selector(setBorderStyle:)]) {
    view.borderStyle = json ? [RCTConvert RCTBorderStyle:json] : defaultView.borderStyle;
  }
}
RCT_CUSTOM_VIEW_PROPERTY(hitSlop, UIEdgeInsets, RCTView)
{
  if ([view respondsToSelector:@selector(setHitTestEdgeInsets:)]) {
    if (json) {
      UIEdgeInsets hitSlopInsets = [RCTConvert UIEdgeInsets:json];
      view.hitTestEdgeInsets =
          UIEdgeInsetsMake(-hitSlopInsets.top, -hitSlopInsets.left, -hitSlopInsets.bottom, -hitSlopInsets.right);
    } else {
      view.hitTestEdgeInsets = defaultView.hitTestEdgeInsets;
    }
  }
}

#if TARGET_OS_OSX // [macOS
// macOS properties
RCT_CUSTOM_VIEW_PROPERTY(acceptsFirstMouse, BOOL, RCTView)
{
  if ([view respondsToSelector:@selector(setAcceptsFirstMouse:)]) {
    view.acceptsFirstMouse = json ? [RCTConvert BOOL:json] : defaultView.acceptsFirstMouse;
  }
}

RCT_EXPORT_VIEW_PROPERTY(mouseDownCanMoveWindow, BOOL)

RCT_REMAP_VIEW_PROPERTY(allowsVibrancy, allowsVibrancyInternal, BOOL)

RCT_CUSTOM_VIEW_PROPERTY(focusable, BOOL, RCTView)
{
  if ([view respondsToSelector:@selector(setFocusable:)]) {
    view.focusable = json ? [RCTConvert BOOL:json] : defaultView.focusable;
  }
}

RCT_CUSTOM_VIEW_PROPERTY(enableFocusRing, BOOL, RCTView)
{
  if ([view respondsToSelector:@selector(setEnableFocusRing:)]) {
    view.enableFocusRing = json ? [RCTConvert BOOL:json] : defaultView.enableFocusRing;
  }
}

RCT_REMAP_VIEW_PROPERTY(tooltip, toolTip, NSString)

RCT_CUSTOM_VIEW_PROPERTY(draggedTypes, NSArray<NSPasteboardType>*, RCTView)
{
  NSArray<NSPasteboardType> *currentTypes = view.registeredDraggedTypes;
  NSArray<NSPasteboardType> *types = json ? [RCTConvert NSPasteboardTypeArray:json] : defaultView.registeredDraggedTypes;
  if (![currentTypes isEqualToArray:types]) {
    [view unregisterDraggedTypes];
  }
  [view registerForDraggedTypes:types];
}

#endif // macOS]

RCT_CUSTOM_VIEW_PROPERTY(collapsable, BOOL, RCTView)
{
  // Property is only to be used in the new renderer.
  // It is necessary to add it here, otherwise it gets
  // filtered by view configs.
}

RCT_CUSTOM_VIEW_PROPERTY(experimental_layoutConformance, NSString *, RCTView)
{
  // Property is only to be used in the new renderer.
  // It is necessary to add it here, otherwise it gets
  // filtered by view configs.
}

#define RCT_VIEW_BORDER_PROPERTY(SIDE)                                                               \
  RCT_CUSTOM_VIEW_PROPERTY(border##SIDE##Width, float, RCTView)                                      \
  {                                                                                                  \
    if ([view respondsToSelector:@selector(setBorder##SIDE##Width:)]) {                              \
      view.border##SIDE##Width = json ? [RCTConvert CGFloat:json] : defaultView.border##SIDE##Width; \
    }                                                                                                \
  }                                                                                                  \
  RCT_CUSTOM_VIEW_PROPERTY(border##SIDE##Color, UIColor, RCTView)                                    \
  {                                                                                                  \
    if ([view respondsToSelector:@selector(setBorder##SIDE##Color:)]) {                              \
      view.border##SIDE##Color = json ? [RCTConvert UIColor:json] : defaultView.border##SIDE##Color; \
    }                                                                                                \
  }

RCT_VIEW_BORDER_PROPERTY(Top)
RCT_VIEW_BORDER_PROPERTY(Right)
RCT_VIEW_BORDER_PROPERTY(Bottom)
RCT_VIEW_BORDER_PROPERTY(Left)
RCT_VIEW_BORDER_PROPERTY(Start)
RCT_VIEW_BORDER_PROPERTY(End)
RCT_VIEW_BORDER_PROPERTY(Block)
RCT_VIEW_BORDER_PROPERTY(BlockEnd)
RCT_VIEW_BORDER_PROPERTY(BlockStart)

#define RCT_VIEW_BORDER_RADIUS_PROPERTY(SIDE)                                                          \
  RCT_CUSTOM_VIEW_PROPERTY(border##SIDE##Radius, CGFloat, RCTView)                                     \
  {                                                                                                    \
    if ([view respondsToSelector:@selector(setBorder##SIDE##Radius:)]) {                               \
      view.border##SIDE##Radius = json ? [RCTConvert CGFloat:json] : defaultView.border##SIDE##Radius; \
    }                                                                                                  \
  }

RCT_VIEW_BORDER_RADIUS_PROPERTY(TopLeft)
RCT_VIEW_BORDER_RADIUS_PROPERTY(TopRight)
RCT_VIEW_BORDER_RADIUS_PROPERTY(TopStart)
RCT_VIEW_BORDER_RADIUS_PROPERTY(TopEnd)
RCT_VIEW_BORDER_RADIUS_PROPERTY(BottomLeft)
RCT_VIEW_BORDER_RADIUS_PROPERTY(BottomRight)
RCT_VIEW_BORDER_RADIUS_PROPERTY(BottomStart)
RCT_VIEW_BORDER_RADIUS_PROPERTY(BottomEnd)
RCT_VIEW_BORDER_RADIUS_PROPERTY(EndEnd)
RCT_VIEW_BORDER_RADIUS_PROPERTY(EndStart)
RCT_VIEW_BORDER_RADIUS_PROPERTY(StartEnd)
RCT_VIEW_BORDER_RADIUS_PROPERTY(StartStart)

RCT_REMAP_VIEW_PROPERTY(display, reactDisplay, YGDisplay)
RCT_REMAP_VIEW_PROPERTY(zIndex, reactZIndex, NSInteger)

// [macOS
RCT_EXPORT_VIEW_PROPERTY(onFocus, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onBlur, RCTBubblingEventBlock)
// macOS]


#if TARGET_OS_OSX // [macOS
#pragma mark - macOS properties

RCT_EXPORT_VIEW_PROPERTY(onMouseEnter, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMouseLeave, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDragEnter, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDragLeave, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDrop, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(passthroughAllKeyEvents, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onKeyDown, RCTDirectEventBlock) // macOS keyboard events
RCT_EXPORT_VIEW_PROPERTY(onKeyUp, RCTDirectEventBlock) // macOS keyboard events
RCT_EXPORT_VIEW_PROPERTY(validKeysDown, NSArray<RCTHandledKey *>)
RCT_EXPORT_VIEW_PROPERTY(validKeysUp, NSArray<RCTHandledKey *>)

#endif // macOS]

#pragma mark - ShadowView properties

RCT_EXPORT_SHADOW_PROPERTY(top, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(right, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(start, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(end, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(bottom, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(left, YGValue)

RCT_EXPORT_SHADOW_PROPERTY(width, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(height, YGValue)

RCT_EXPORT_SHADOW_PROPERTY(minWidth, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(maxWidth, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(minHeight, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(maxHeight, YGValue)

RCT_EXPORT_SHADOW_PROPERTY(borderTopWidth, float)
RCT_EXPORT_SHADOW_PROPERTY(borderRightWidth, float)
RCT_EXPORT_SHADOW_PROPERTY(borderBottomWidth, float)
RCT_EXPORT_SHADOW_PROPERTY(borderLeftWidth, float)
RCT_EXPORT_SHADOW_PROPERTY(borderStartWidth, float)
RCT_EXPORT_SHADOW_PROPERTY(borderEndWidth, float)
RCT_EXPORT_SHADOW_PROPERTY(borderWidth, float)

RCT_EXPORT_SHADOW_PROPERTY(marginTop, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(marginRight, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(marginBottom, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(marginLeft, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(marginStart, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(marginEnd, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(marginVertical, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(marginHorizontal, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(margin, YGValue)

RCT_EXPORT_SHADOW_PROPERTY(paddingTop, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(paddingRight, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(paddingBottom, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(paddingLeft, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(paddingStart, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(paddingEnd, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(paddingVertical, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(paddingHorizontal, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(padding, YGValue)

RCT_EXPORT_SHADOW_PROPERTY(flex, float)
RCT_EXPORT_SHADOW_PROPERTY(flexGrow, float)
RCT_EXPORT_SHADOW_PROPERTY(flexShrink, float)
RCT_EXPORT_SHADOW_PROPERTY(flexBasis, YGValue)
RCT_EXPORT_SHADOW_PROPERTY(flexDirection, YGFlexDirection)
RCT_EXPORT_SHADOW_PROPERTY(flexWrap, YGWrap)
RCT_EXPORT_SHADOW_PROPERTY(justifyContent, YGJustify)
RCT_EXPORT_SHADOW_PROPERTY(alignItems, YGAlign)
RCT_EXPORT_SHADOW_PROPERTY(alignSelf, YGAlign)
RCT_EXPORT_SHADOW_PROPERTY(alignContent, YGAlign)
RCT_EXPORT_SHADOW_PROPERTY(position, YGPositionType)
RCT_EXPORT_SHADOW_PROPERTY(aspectRatio, float)
RCT_EXPORT_SHADOW_PROPERTY(rowGap, float)
RCT_EXPORT_SHADOW_PROPERTY(columnGap, float)
RCT_EXPORT_SHADOW_PROPERTY(gap, float)

RCT_EXPORT_SHADOW_PROPERTY(overflow, YGOverflow)
RCT_EXPORT_SHADOW_PROPERTY(display, YGDisplay)

RCT_EXPORT_SHADOW_PROPERTY(onLayout, RCTDirectEventBlock)

RCT_EXPORT_SHADOW_PROPERTY(direction, YGDirection)

// The events below define the properties that are not used by native directly, but required in the view config for new
// renderer to function.
// They can be deleted after Static View Configs are rolled out.

// PanResponder handlers
RCT_CUSTOM_VIEW_PROPERTY(onMoveShouldSetResponder, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onMoveShouldSetResponderCapture, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onStartShouldSetResponder, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onStartShouldSetResponderCapture, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onResponderGrant, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onResponderReject, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onResponderStart, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onResponderEnd, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onResponderRelease, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onResponderMove, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onResponderTerminate, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onResponderTerminationRequest, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onShouldBlockNativeResponder, BOOL, RCTView) {}

// Touch events
RCT_CUSTOM_VIEW_PROPERTY(onTouchStart, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onTouchMove, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onTouchEnd, BOOL, RCTView) {}
RCT_CUSTOM_VIEW_PROPERTY(onTouchCancel, BOOL, RCTView) {}

// Experimental/WIP Pointer Events (not yet ready for use)
RCT_EXPORT_VIEW_PROPERTY(onClick, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPointerCancel, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPointerDown, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPointerMove, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPointerUp, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPointerEnter, RCTCapturingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPointerLeave, RCTCapturingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPointerOver, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPointerOut, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onGotPointerCapture, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLostPointerCapture, RCTBubblingEventBlock)

@end
