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
  _capturedValues = [NSMutableDictionary new];
  
  for (NSString* value in _capturedValues)
  {
    if ([value isEqual:@"width"]) {
        _capturedValues[@"width"] = [NSNumber numberWithDouble:(double)(view.bounds.size.width)];
    } else if ([value isEqual:@"height"]) {
      _capturedValues[@"height"] = [NSNumber numberWithDouble:(double)(view.bounds.size.height)];
    } else if ([value isEqual:@"originX"]) {
      _capturedValues[@"originX"] = [NSNumber numberWithDouble:view.center.x];
    } else if ([value isEqual:@"originY"]) {
      _capturedValues[@"originY"] = [NSNumber numberWithDouble:view.center.y];
    }
  }
}

@end
