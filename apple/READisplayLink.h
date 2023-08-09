#if !TARGET_OS_OSX

#import <UIKit/UIKit.h>

#define RNADisplayLink CADisplayLink

#else // TARGET_OS_OSX [

#ifdef __cplusplus
extern "C" {
#endif

#import <React/RCTPlatformDisplayLink.h>

#ifdef __cplusplus
}
#endif

#define RNADisplayLink RCTPlatformDisplayLink

#endif // ] TARGET_OS_OSX
