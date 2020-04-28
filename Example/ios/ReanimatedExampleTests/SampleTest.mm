//
//  ReanimatedExampleTests.m
//  ReanimatedExampleTests
//
//  Created by Karol Bisztyga on 3/19/20.
//  Copyright © 2020 Facebook. All rights reserved.
//
#import <XCTest/XCTest.h>
#import "SharedDouble.h"

@interface SampleTest : XCTestCase
@end

@implementation SampleTest

- (void)testExample {
  SharedDouble sd(0, 5.7, nullptr, nullptr, nullptr);
  XCTAssert(0 == sd.id, @"id passed");
  XCTAssert(5.7 == sd.value, @"value passed");
  sd.setNewValue(std::shared_ptr<SharedDouble>(new SharedDouble(1, 55.2, nullptr, nullptr, nullptr)));
  XCTAssert(55.2 == sd.value, @"value cahnged");
}

@end
