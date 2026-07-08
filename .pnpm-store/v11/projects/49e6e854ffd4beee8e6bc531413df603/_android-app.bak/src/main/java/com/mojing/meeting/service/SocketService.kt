package com.mojing.meeting.service

import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import java.net.URI

class SocketService {
    private var socket: Socket? = null
    private val messageListeners = mutableListOf<(JSONObject) -> Unit>()
    
    fun connect(url: String = "http://nicouvip.asuscomm.com:8802") {
        try {
            val options = IO.Options().apply {
                transports = arrayOf("websocket")
                reconnection = true
                reconnectionAttempts = 10
                reconnectionDelay = 1000
            }
            socket = IO.socket(URI.create(url), options)
            socket?.connect()
            
            socket?.on("connect") {
                socket?.emit("join", "meeting-room", JSONObject().apply {
                    put("name", "手机用户")
                    put("color", "#94A3B8")
                })
            }
            
            socket?.on("chat") { args ->
                if (args.isNotEmpty() && args[0] is JSONObject) {
                    messageListeners.forEach { it(args[0] as JSONObject) }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun sendMessage(text: String) {
        socket?.emit("chat", JSONObject().apply {
            put("senderName", "手机用户")
            put("text", text)
        })
    }
    
    fun onMessage(listener: (JSONObject) -> Unit) {
        messageListeners.add(listener)
    }
    
    fun disconnect() {
        socket?.disconnect()
    }
    
    fun isConnected(): Boolean = socket?.connected() ?: false
}
