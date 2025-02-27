#if TARGET_OS_OSX

#ifdef __cplusplus
extern "C" {
#endif // __cplusplus

#import <React/RCTPlatformDisplayLink.h>

#ifdef __cplusplus
}
#endif // __cplusplus

typedef RCTPlatformDisplayLink WorkletsDisplayLink;

#else // TARGET_OS_OSX

#import <QuartzCore/CADisplayLink.h>

typedef CADisplayLink WorkletsDisplayLink;

#endif // TARGET_OS_OSX
