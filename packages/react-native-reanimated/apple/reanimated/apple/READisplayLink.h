#pragma once

#import <Foundation/Foundation.h>

#if !TARGET_OS_OSX

#import <QuartzCore/CADisplayLink.h>

typedef CADisplayLink READisplayLink;

#else // TARGET_OS_OSX [

#ifdef __cplusplus
extern "C" {
#endif

#import <React/RCTPlatformDisplayLink.h>

#ifdef __cplusplus
}
#endif

typedef RCTPlatformDisplayLink READisplayLink;

#endif // ] TARGET_OS_OSX

/// Creates a display link and registers it on the main run loop.
static inline READisplayLink *REAMakeDisplayLink(id target, SEL selector)
{
  READisplayLink *displayLink = [READisplayLink displayLinkWithTarget:target selector:selector];
#if !TARGET_OS_OSX
  displayLink.preferredFramesPerSecond = 120; // will fallback to 60 fps for devices without Pro Motion display
#endif // TARGET_OS_OSX
  [displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  return displayLink;
}
