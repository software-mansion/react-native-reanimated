//
//  SpeedChecker.h
//  Pods
//
//  Created by Szymon Kapala on 14/04/2020.
//

#ifndef SpeedChecker_h
#define SpeedChecker_h

#include "Logger.h"

class SpeedChecker {
public:
  static void checkSpeed(std::string tag, std::function<void()> fun) {
  //  auto start = std::chrono::system_clock::now();
    fun();
  //  auto end = std::chrono::system_clock::now();
  //  std::chrono::duration<double> elapsed_seconds = end-start;
    //tag += " " + std::to_string(elapsed_seconds.count()) + "s";
   // Logger::log(tag.c_str());
  }
};

#endif /* SpeedChecker_h */
