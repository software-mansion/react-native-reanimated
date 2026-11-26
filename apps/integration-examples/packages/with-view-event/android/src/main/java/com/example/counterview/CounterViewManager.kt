package com.example.counterview

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.CounterViewManagerDelegate
import com.facebook.react.viewmanagers.CounterViewManagerInterface

@ReactModule(name = CounterViewManager.NAME)
class CounterViewManager :
    SimpleViewManager<CounterView>(),
    CounterViewManagerInterface<CounterView> {
    private val delegate = CounterViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<CounterView> = delegate

    override fun getName() = NAME

    override fun createViewInstance(context: ThemedReactContext) = CounterView(context)

    companion object {
        const val NAME = "CounterView"
    }
}
