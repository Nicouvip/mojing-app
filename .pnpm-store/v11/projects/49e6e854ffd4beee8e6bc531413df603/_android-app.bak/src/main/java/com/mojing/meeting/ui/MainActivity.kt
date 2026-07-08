package com.mojing.meeting.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.mojing.meeting.ui.theme.MoJingTheme
import com.mojing.meeting.service.SocketService

class MainActivity : ComponentActivity() {
    private lateinit var socketService: SocketService
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        socketService = SocketService()
        socketService.connect()
        
        setContent {
            MoJingTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    MeetingRoomScreen(socketService)
                }
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        socketService.disconnect()
    }
}
