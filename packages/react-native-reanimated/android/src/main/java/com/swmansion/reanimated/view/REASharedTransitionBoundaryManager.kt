package com.swmansion.reanimated.view

import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager

class REASharedTransitionBoundaryManager : ViewGroupManager<REASharedTransitionBoundaryView>() {
    override fun getName(): String = "REASharedTransitionBoundary"

    override fun createViewInstance(themedReactContext: ThemedReactContext): REASharedTransitionBoundaryView =
        REASharedTransitionBoundaryView(themedReactContext)
}
