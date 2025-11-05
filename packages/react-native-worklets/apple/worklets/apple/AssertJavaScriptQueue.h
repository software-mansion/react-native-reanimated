#import <react/debug/react_native_assert.h>

// Copied from RCTJSThreadManager.mm
static NSString *const RCTJSThreadName = @"com.facebook.react.runtime.JavaScript";

static BOOL IsJavaScriptQueue()
{
  return [NSThread.currentThread.name isEqualToString:RCTJSThreadName];
}

static void AssertJavaScriptQueue()
{
  react_native_assert(IsJavaScriptQueue() && "This function must be called on the JavaScript queue");
}
