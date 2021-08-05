//
//  NativeMethodsHolder.h
//  RNReanimated
//
//  Created by Krzysztof Piaskowy on 02/08/2021.
//
#include <hash_map>
#include <string>

#ifndef NativeMethodsHolder_h
#define NativeMethodsHolder_h

@interface NativeMethodsHolder

public void startAnimationForTag(int tag, std::string type, hash_map<std::string, float> values);
public void removeConfigForTag(int tag);

@end

#endif /* NativeMethodsHolder_h */
