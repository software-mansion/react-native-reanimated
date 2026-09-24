#import <Foundation/Foundation.h>

#if !TARGET_OS_TV && !TARGET_OS_OSX && !TARGET_OS_VISION
#import <UIKit/UIKit.h>

/// UIKit reports a hinge only through the updates of a `UIHingeInteraction`,
/// so the probe attaches one when the app's first scene connects. The answer
/// arrives a few milliseconds later, before JS renders.
@interface ReanimatedHingeProbe : NSObject

+ (bool)hasHinge;
/// Keeps the interaction on the probe's window, also when the probe moves to
/// another scene. Main thread only.
+ (void)addInteraction:(id<UIInteraction>)interaction;
+ (void)removeInteraction:(id<UIInteraction>)interaction;

@end
#endif
