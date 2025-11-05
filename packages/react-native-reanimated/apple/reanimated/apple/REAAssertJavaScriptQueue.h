#import <react/debug/react_native_assert.h>

// Copied from RCTJSThreadManager.mm
static NSString *const RCTJSThreadName = @"com.facebook.react.runtime.JavaScript";

static BOOL REAIsJavaScriptQueue()
{
  return [NSThread.currentThread.name isEqualToString:RCTJSThreadName];
}

static void REAAssertJavaScriptQueue()
{
  react_native_assert(REAIsJavaScriptQueue() && "This function must be called on the JavaScript queue");
}
