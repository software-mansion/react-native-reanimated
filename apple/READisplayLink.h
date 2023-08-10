#if !TARGET_OS_OSX

#import <QuartzCore/CADisplayLink.h>

#define READisplayLink CADisplayLink

#else // TARGET_OS_OSX [

#ifdef __cplusplus
extern "C" {
#endif

#import <React/RCTPlatformDisplayLink.h>

#ifdef __cplusplus
}
#endif

#define READisplayLink RCTPlatformDisplayLink

#endif // ] TARGET_OS_OSX
