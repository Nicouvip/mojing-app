package com.mojing.meeting.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mojing.meeting.service.SocketService
import kotlinx.coroutines.launch
import org.json.JSONObject

data class ChatMessage(
    val id: Int,
    val role: String,
    val text: String,
    val isMe: Boolean = false,
    val time: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MeetingRoomScreen(socketService: SocketService) {
    var messages by remember { mutableStateOf(listOf<ChatMessage>()) }
    var inputText by remember { mutableStateOf("") }
    var msgId by remember { mutableStateOf(0) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    var connected by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        socketService.onMessage { data ->
            val text = data.optString("text", data.optString("content", ""))
            val sender = data.optString("senderName", "系统")
            val newMsg = ChatMessage(msgId++, sender, text, sender == "手机用户")
            messages = messages + newMsg
            scope.launch { listState.animateScrollToItem(messages.size - 1) }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0C0D10))
    ) {
        // Top Bar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color(0xFF121318),
            shadowElevation = 2.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "墨境 · 会议室",
                    color = Color(0xFFC9A84C),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    if (connected) "🟢" else "🔴",
                    fontSize = 10.sp
                )
            }
        }

        // Message List
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            items(messages) { msg ->
                MessageBubble(msg)
            }
        }

        // Input Area
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color(0xFF121318)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("输入消息...", color = Color(0xFF5A5A5A)) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFFC9A84C),
                        unfocusedBorderColor = Color(0xFF252830),
                        cursorColor = Color(0xFFC9A84C),
                        focusedTextColor = Color(0xFFE6E3DB),
                        unfocusedTextColor = Color(0xFFE6E3DB),
                        focusedContainerColor = Color(0xFF14171E),
                        unfocusedContainerColor = Color(0xFF14171E)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true,
                    maxLines = 1
                )
                Spacer(Modifier.width(8.dp))
                Button(
                    onClick = {
                        if (inputText.isNotBlank()) {
                            socketService.sendMessage(inputText)
                            val newMsg = ChatMessage(msgId++, "手机用户", inputText, true)
                            messages = messages + newMsg
                            inputText = ""
                            scope.launch { listState.animateScrollToItem(messages.size - 1) }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFC9A84C),
                        contentColor = Color(0xFF0C0D10)
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("发送", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun MessageBubble(msg: ChatMessage) {
    val bgColor = if (msg.isMe) Color(0xFF1E2128) else Color(0xFF181A22)
    val align = if (msg.isMe) Alignment.End else Alignment.Start
    val bubbleShape = RoundedCornerShape(
        topStart = 12.dp, topEnd = 12.dp,
        bottomStart = if (msg.isMe) 12.dp else 4.dp,
        bottomEnd = if (msg.isMe) 4.dp else 12.dp
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalAlignment = if (msg.isMe) Alignment.End else Alignment.Start
    ) {
        if (!msg.isMe && msg.role != "系统") {
            Text(
                msg.role,
                color = Color(0xFF94A3B8),
                fontSize = 11.sp,
                modifier = Modifier.padding(start = 4.dp, bottom = 2.dp)
            )
        }
        Surface(
            shape = bubbleShape,
            color = bgColor,
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Text(
                msg.text,
                color = Color(0xFFE6E3DB),
                fontSize = 14.sp,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                lineHeight = 22.sp,
                maxLines = 20,
                overflow = TextOverflow.Ellipsis
            )
        }
        if (msg.isMe) {
            Spacer(Modifier.height(2.dp))
        }
    }
}
