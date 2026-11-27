package com.example.polledcounter

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class PolledCounterPackage : BaseReactPackage() {
    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? = if (name == NativePolledCounterSpec.NAME) PolledCounterModule(reactContext) else null

    override fun getReactModuleInfoProvider() =
        ReactModuleInfoProvider {
            mapOf(
                NativePolledCounterSpec.NAME to
                    ReactModuleInfo(
                        name = NativePolledCounterSpec.NAME,
                        className = NativePolledCounterSpec.NAME,
                        canOverrideExistingModule = false,
                        needsEagerInit = false,
                        isCxxModule = false,
                        isTurboModule = true,
                    ),
            )
        }
}
