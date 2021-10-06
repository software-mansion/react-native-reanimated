
#ifndef COMMON_CPP_HEADERS_TOOLS_REANIMATEDHIDDENHEADERS_H_
#define COMMON_CPP_HEADERS_TOOLS_REANIMATEDHIDDENHEADERS_H_

#if defined(ONANDROID)
#include "Logger.h"
#include "LoggerInterface.h"
#include "SpeedChecker.h"
#else
#include "Common/cpp/hidden_headers/Logger.h"
#include "Common/cpp/hidden_headers/LoggerInterface.h"
#include "Common/cpp/hidden_headers/SpeedChecker.h"
#endif

#endif // COMMON_CPP_HEADERS_TOOLS_REANIMATEDHIDDENHEADERS_H_
