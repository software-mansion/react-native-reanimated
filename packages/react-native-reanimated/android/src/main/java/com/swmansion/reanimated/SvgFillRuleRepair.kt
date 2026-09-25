package com.swmansion.reanimated

import android.graphics.Path
import android.view.View
import java.lang.reflect.Field

/**
 * react-native-svg (as of 15.15.5) never switches a fill rule back to nonzero on Android:
 * `RenderableView.setFillRule` assigns its `fillRule` field only for evenodd, so a fill rule that
 * animates sticks at evenodd. The field is public and drives the next draw, so the value a
 * Reanimated commit carries is assigned to it directly. A fixed react-native-svg makes this a
 * no-op.
 */
internal object SvgFillRuleRepair {
    /** Null marks a class without the field, so the lookup runs once per class. */
    private val fields = HashMap<Class<*>, Field?>()

    fun apply(
        view: View,
        evenOdd: Boolean,
    ) {
        val viewClass = view.javaClass
        if (!fields.containsKey(viewClass)) fields[viewClass] = fillRuleFieldOf(viewClass)
        val field = fields[viewClass] ?: return
        val fillType = if (evenOdd) Path.FillType.EVEN_ODD else Path.FillType.WINDING
        if (field.get(view) === fillType) return
        field.set(view, fillType)
        // RNSVG overrides invalidate() to drop its cached path, which is what holds the fill type.
        view.invalidate()
    }

    private fun fillRuleFieldOf(viewClass: Class<*>): Field? =
        runCatching { viewClass.getField("fillRule") }
            .getOrNull()
            ?.takeIf { it.type == Path.FillType::class.java }
}
