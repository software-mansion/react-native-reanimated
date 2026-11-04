package com.swmansion.reanimated

internal fun resolveCustomEventName(eventName: String): String =
    if (eventName.startsWith("top")) {
        "on" + eventName.substring(3)
    } else {
        eventName
    }
