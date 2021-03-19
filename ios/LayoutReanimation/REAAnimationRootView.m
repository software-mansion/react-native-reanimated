//
//  REAAnimationRootView.m
//  DoubleConversion
//
//  Created by Szymon Kapala on 22/03/2021.
//

#import "REAAnimationRootView.h"

@implementation REAAnimationRootView

- (instancetype)init
{
    if (self = [super init])
    {
        // In the future it should be set separately for each AnimationRoot by a user 
        self.capturablePropeties = [[NSSet alloc] initWithArray: @[@"height", @"width", @"originX", @"originY"]];
        return self;
    }
    return nil;
}

@end
