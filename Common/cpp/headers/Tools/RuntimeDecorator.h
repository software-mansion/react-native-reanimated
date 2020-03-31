//
//  RuntimeDecorator.hpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 31/03/2020.
//

#ifndef RuntimeDecorator_h
#define RuntimeDecorator_h

#include <stdio.h>
#include <jsi/jsi.h>

using namespace facebook;

class RuntimeDecorator {
public:
  static void addGlobalMethods(jsi::Runtime &rt);
};

#endif /* RuntimeDecorator_h */
