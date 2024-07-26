#pragma once

#ifdef ANDROID
#include "Logger.h"
#include "LoggerInterface.h"
#include "SpeedChecker.h"
#else
#include "Common/cpp/Worklets/hidden_headers/Logger.h"
#include "Common/cpp/Worklets/hidden_headers/LoggerInterface.h"
#include "Common/cpp/Worklets/hidden_headers/SpeedChecker.h"
#endif
