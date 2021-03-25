//
//  REASnapshooter.m
//  RNReanimated
//
//  Created by Szymon Kapala on 24/03/2021.
//

#import "REASnapshooter.h"

@implementation REASnapshooter 

-(instancetype)initWithTag:(NSNumber*)tag capturableProps:(NSSet*)capturableProps
{
  if (self = [super init]) {
    _capturableProps = capturableProps;
    _tag = tag;
    return self;
  }
  return nil;
}

-(void)takeSnapshot:(UIView*)view
{
  NSMutableDictionary* values = [NSMutableDictionary new];
  
  for (NSString* value in _capturableProps)
  {
    if ([value isEqual:@"width"]) {
        values[@"width"] = [NSNumber numberWithDouble:(double)(view.bounds.size.width)];
    } else if ([value isEqual:@"height"]) {
      values[@"height"] = [NSNumber numberWithDouble:(double)(view.bounds.size.height)];
    } else if ([value isEqual:@"originX"]) {
      values[@"originX"] = [NSNumber numberWithDouble:view.center.x];
    } else if ([value isEqual:@"originY"]) {
      values[@"originY"] = [NSNumber numberWithDouble:view.center.y];
    }
  }
  
  self.capturedValues[view] = values;
}

@end
