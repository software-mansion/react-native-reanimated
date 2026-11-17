#import <Foundation/Foundation.h>
#import <react/debug/react_native_assert.h>

// Copied from RCTJSThreadManager.mm
static NSString *const RCTJSThreadName = @"com.facebook.react.runtime.JavaScript";

static inline BOOL IsJavaScriptQueue()
{
  return [NSThread.currentThread.name isEqualToString:RCTJSThreadName];
}

static inline void AssertJavaScriptQueue()
{
  react_native_assert(IsJavaScriptQueue() && "This function must be called on the JavaScript queue");
}
