#pragma once

/*
On Android JS_RUNTIME_HERMES is set in CMakeList.txt,
but on iOS there is no simple way to defect if Hermes exists
so we have to check if headers are available.
*/
#if __APPLE__ && __has_include(<hermes/hermes.h>)
#define JS_RUNTIME_HERMES 1
#endif
