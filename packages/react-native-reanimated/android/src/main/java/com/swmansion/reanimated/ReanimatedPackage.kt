package com.swmansion.reanimated

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.swmansion.reanimated.view.REASharedTransitionBoundaryManager

class ReanimatedPackage : BaseReactPackage() {
    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? =
        when (name) {
            NativeReanimatedModuleSpec.NAME -> ReanimatedModule(reactContext)
            else -> null
        }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(REASharedTransitionBoundaryManager())

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        val reactModule = ReanimatedModule::class.java.getAnnotation(ReactModule::class.java)!!
        val reactModuleInfo =
            ReactModuleInfo(
                reactModule.name,
                ReanimatedModule::class.java.name,
                reactModule.canOverrideExistingModule,
                reactModule.needsEagerInit,
                reactModule.isCxxModule,
                true,
            )
        return ReactModuleInfoProvider { mapOf(reactModule.name to reactModuleInfo) }
    }
}
