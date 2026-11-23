#pragma once

#if __has_include(<React/RendererCore.h>)
#include <React/RendererCore.h>
#else
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/core/EventDispatcher.h>
#include <react/renderer/core/LayoutContext.h>
#include <react/renderer/core/LayoutableShadowNode.h>
#include <react/renderer/core/Props.h>
#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/RawProps.h>
#include <react/renderer/core/ReactPrimitives.h>
#include <react/renderer/core/ShadowNode.h>
#include <react/renderer/core/ShadowNodeFamily.h>
#include <react/renderer/core/graphicsConversions.h>
#endif
