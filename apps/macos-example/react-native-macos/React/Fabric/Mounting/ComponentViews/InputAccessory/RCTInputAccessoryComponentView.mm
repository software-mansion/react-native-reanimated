/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTInputAccessoryComponentView.h"

#import <React/RCTBackedTextInputViewProtocol.h>
#import <React/RCTConversions.h>
#import <React/RCTSurfaceTouchHandler.h>
#import <React/RCTUtils.h>
#import <React/UIView+React.h>
#import <react/renderer/components/inputaccessory/InputAccessoryComponentDescriptor.h>
#import <react/renderer/components/rncore/Props.h>
#import "RCTInputAccessoryContentView.h"

#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

static RCTUIView<RCTBackedTextInputViewProtocol> *_Nullable RCTFindTextInputWithNativeId(RCTUIView *view, NSString *nativeId) // [macOS]
{
  if ([view respondsToSelector:@selector(inputAccessoryViewID)] &&
      [view respondsToSelector:@selector(setInputAccessoryView:)]) {
    RCTUIView<RCTBackedTextInputViewProtocol> *typed = (RCTUIView<RCTBackedTextInputViewProtocol> *)view; // [macOS]
    if (!nativeId || [typed.inputAccessoryViewID isEqualToString:nativeId]) {
      return typed;
    }
  }

  for (RCTUIView *subview in view.subviews) { // [macOS]
    RCTUIView<RCTBackedTextInputViewProtocol> *result = RCTFindTextInputWithNativeId(subview, nativeId); // [macOS]
    if (result) {
      return result;
    }
  }

  return nil;
}

@implementation RCTInputAccessoryComponentView {
  InputAccessoryShadowNode::ConcreteState::Shared _state;
  RCTInputAccessoryContentView *_contentView;
  RCTSurfaceTouchHandler *_touchHandler;
  RCTUIView<RCTBackedTextInputViewProtocol> __weak *_textInput; // [macOS]
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const InputAccessoryProps>();
    _props = defaultProps;
    _contentView = [RCTInputAccessoryContentView new];
    _touchHandler = [RCTSurfaceTouchHandler new];
    [_touchHandler attachToView:_contentView];
  }

  return self;
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];

  if (self.window && !_textInput) {
    if (self.nativeId) {
#if !TARGET_OS_OSX // [macOS]
      _textInput = RCTFindTextInputWithNativeId(self.window, self.nativeId);
#if !TARGET_OS_VISION // [visionOS]
      _textInput.inputAccessoryView = _contentView;
#endif // [visionOS]
#else // [macOS
      _textInput = RCTFindTextInputWithNativeId(self.window.contentView, self.nativeId);
#endif // macOS]
    } else {
      _textInput = RCTFindTextInputWithNativeId(_contentView, nil);
    }

    if (!self.nativeId) {
      [self becomeFirstResponder];
    }
  }
}

- (BOOL)canBecomeFirstResponder
{
  return true;
}

#if !TARGET_OS_VISION // [visionOS]
- (RCTUIView *)inputAccessoryView // [macOS]
{
  return _contentView;
}
#endif // [visionOS]

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<InputAccessoryComponentDescriptor>();
}

- (void)mountChildComponentView:(RCTUIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index // [macOS]
{
  [_contentView insertSubview:childComponentView atIndex:index];
}

- (void)unmountChildComponentView:(RCTUIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index // [macOS]
{
  [childComponentView removeFromSuperview];
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &oldInputAccessoryProps = static_cast<const InputAccessoryProps &>(*_props);
  const auto &newInputAccessoryProps = static_cast<const InputAccessoryProps &>(*props);

  if (newInputAccessoryProps.backgroundColor != oldInputAccessoryProps.backgroundColor) {
    _contentView.backgroundColor = RCTUIColorFromSharedColor(newInputAccessoryProps.backgroundColor);
  }

  [super updateProps:props oldProps:oldProps];
  self.hidden = true;
}

- (void)updateState:(const facebook::react::State::Shared &)state
           oldState:(const facebook::react::State::Shared &)oldState
{
  _state = std::static_pointer_cast<InputAccessoryShadowNode::ConcreteState const>(state);
  CGSize oldScreenSize = RCTCGSizeFromSize(_state->getData().viewportSize);
  CGSize viewportSize = RCTViewportSize();
  viewportSize.height = std::nan("");
  if (oldScreenSize.width != viewportSize.width) {
    auto stateData = InputAccessoryState{RCTSizeFromCGSize(viewportSize)};
    _state->updateState(std::move(stateData));
  }
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];

  [_contentView setFrame:RCTCGRectFromRect(layoutMetrics.getContentFrame())];
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _state.reset();
  _textInput = nil;
}

@end

Class<RCTComponentViewProtocol> RCTInputAccessoryCls(void)
{
  return RCTInputAccessoryComponentView.class;
}
