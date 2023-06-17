#import <RNReanimated/NativeMethods.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTScrollView.h>
#import <React/RCTUIManagerUtils.h>

namespace reanimated {

std::vector<std::pair<std::string, double>> measure(int viewTag, RCTUIManager *uiManager)
{
  UIView *view = [uiManager viewForReactTag:@(viewTag)];

  UIView *rootView = view;

  if (view == nil) {
    return std::vector<std::pair<std::string, double>>(1, std::make_pair("x", -1234567.0));
  }

  while (rootView.superview && ![rootView isReactRootView]) {
    rootView = rootView.superview;
  }

  if (rootView == nil) {
    return std::vector<std::pair<std::string, double>>(1, std::make_pair("x", -1234567.0));
  }

  CGRect frame = view.frame;
  CGRect globalBounds = [view convertRect:view.bounds toView:rootView];

  std::vector<std::pair<std::string, double>> result;
  result.push_back({"x", frame.origin.x});
  result.push_back({"y", frame.origin.y});

  result.push_back({"width", globalBounds.size.width});
  result.push_back({"height", globalBounds.size.height});

  result.push_back({"pageX", globalBounds.origin.x});
  result.push_back({"pageY", globalBounds.origin.y});
  return result;
}

void scrollTo(int scrollViewTag, RCTUIManager *uiManager, double x, double y, bool animated)
{
  UIView *view = [uiManager viewForReactTag:@(scrollViewTag)];
  RCTScrollView *scrollView = (RCTScrollView *)view;
  [scrollView scrollToOffset:(CGPoint){(CGFloat)x, (CGFloat)y} animated:animated];
}

void dispatchCommand(RCTUIManager *uiManager, NSNumber *viewTag, NSString *commandID, NSArray *commandArgs)
{
  SEL privateMethodSelector = NSSelectorFromString(@"dispatchViewManagerCommand:commandID:commandArgs:");
  NSInvocation *invocation =
      [NSInvocation invocationWithMethodSignature:[uiManager methodSignatureForSelector:privateMethodSelector]];
  [invocation setSelector:privateMethodSelector];
  [invocation setTarget:uiManager];
  [invocation setArgument:&viewTag atIndex:2];
  [invocation setArgument:&commandID atIndex:3];
  [invocation setArgument:&commandArgs atIndex:4];
  RCTUnsafeExecuteOnUIManagerQueueSync(^{
    [invocation invoke];
  });
}

void setGestureState(id<RNGestureHandlerStateManager> gestureHandlerStateManager, int handlerTag, int newState)
{
  if (gestureHandlerStateManager != nil) {
    [gestureHandlerStateManager setGestureState:newState forHandler:handlerTag];
  }
}

} // namespace reanimated
