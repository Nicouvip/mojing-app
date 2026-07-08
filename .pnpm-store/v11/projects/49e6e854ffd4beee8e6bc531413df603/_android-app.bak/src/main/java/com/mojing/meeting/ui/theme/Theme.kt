package com.mojing.meeting.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFC9A84C),
    secondary = Color(0xFFA68A3A),
    background = Color(0xFF0C0D10),
    surface = Color(0xFF181A22),
    onPrimary = Color(0xFF0C0D10),
    onSecondary = Color(0xFF0C0D10),
    onBackground = Color(0xFFE6E3DB),
    onSurface = Color(0xFFE6E3DB),
)

@Composable
fun MoJingTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography(),
        content = content
    )
}
