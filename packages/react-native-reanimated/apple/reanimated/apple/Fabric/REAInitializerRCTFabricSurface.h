#ifdef RCT_NEW_ARCH_ENABLED

#import <React/RCTFabricSurface.h>
#import <reanimated/apple/REAModule.h>

@interface REAInitializerRCTFabricSurface : RCTFabricSurface

@property __weak REAModule *reaModule;

@end

#endif // RCT_NEW_ARCH_ENABLED
