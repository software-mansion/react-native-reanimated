#pragma once

#if __has_include(<React/View.h>)
#include <React/View.h>
#else
#include <react/renderer/components/view/BaseViewProps.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/components/view/ViewProps.h>
#endif
