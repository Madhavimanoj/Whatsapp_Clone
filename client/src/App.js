import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

// Backend URL as per environment
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";


const socket = io(API_URL, {
  transports: ["websocket"],
  withCredentials: true, // Include cross-origin credentials
});

function App() {
  const [chats, setChats] = useState([]); 
  const [selectedChat, setSelectedChat] = useState(null); 
  const [newMessage, setNewMessage] = useState(""); 
  const [typing, setTyping] = useState(false); 

  // Fetch messages and handle WebSocket events
  useEffect(() => {
    fetchMessages();

   
    socket.on("new_message", (msg) => {
      setChats((prevChats) => {
        const updatedChats = [...prevChats];
        const chatIndex = updatedChats.findIndex((c) => c.wa_id === msg.wa_id);

        if (chatIndex > -1) {
          const chat = updatedChats[chatIndex];
          const alreadyExists = chat.messages.some(
            (m) => m.meta_msg_id === msg.meta_msg_id
          );

          if (!alreadyExists) chat.messages.push(msg);
        } else {
          updatedChats.push({
            wa_id: msg.wa_id,
            name: msg.name,
            number: msg.number,
            messages: [msg],
          });
        }
        return updatedChats;
      });
    });

    // Event: Message status updated
    socket.on("status_updated", (updatedMsg) => {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.wa_id === updatedMsg.wa_id
            ? {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.meta_msg_id === updatedMsg.meta_msg_id
                    ? { ...msg, status: updatedMsg.status }
                    : msg
                ),
              }
            : chat
        )
      );
    });

    // Event: User typing
    socket.on("user_typing", (wa_id) => {
      if (selectedChat?.wa_id === wa_id) {
        setTyping(true);
        setTimeout(() => setTyping(false), 1500); // Clear typing after 1.5 seconds
      }
    });

    // Cleanup: Unsubscribe from events
    return () => {
      socket.off("new_message");
      socket.off("status_updated");
      socket.off("user_typing");
    };
  }, [selectedChat?.wa_id]);

  // Fetch chat messages from the backend
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/webhook/messages`);
      if (res.data && res.data.length > 0) {
        setChats(res.data);
      } else {
        setChats([
          {
            wa_id: "demo1",
            name: "Demo User",
            number: "+1234567890",
            messages: [
              {
                meta_msg_id: "welcome-msg",
                message: "Welcome! No real data yet.",
                timestamp: new Date(),
                status: "delivered",
                direction: "incoming",
              },
            ],
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      // Provide fallback data
      setChats([
        {
          wa_id: "error1",
          name: "Error Chat",
          number: "+1234567891",
          messages: [
            {
              meta_msg_id: "error-msg",
              message: "Failed to load messages.",
              timestamp: new Date(),
              status: "failed",
              direction: "incoming",
            },
          ],
        },
      ]);
    }
  };

  // Send new messages
  const handleSend = async () => {
    if (!newMessage || !selectedChat) return;

    const payload = {
      type: "message",
      wa_id: selectedChat.wa_id,
      name: selectedChat.name,
      number: selectedChat.number,
      message: newMessage,
      timestamp: new Date().toISOString(),
      meta_msg_id: `msg_${Date.now()}`,
      direction: "outgoing",
    };

    try {
      await axios.post(`${API_URL}/webhook/receive`, payload);
      setNewMessage(""); // Clear input
    } catch (error) {
      console.error("Message sending failed:", error);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar with chat list */}
      <div className="sidebar">
        {chats.map((chat, i) => (
          <div
            key={i}
            className={`chat-item ${
              selectedChat?.wa_id === chat.wa_id ? "selected" : ""
            }`}
            onClick={() => setSelectedChat(chat)}
          >
            <img
              src="/images/profile.png"
              alt="Profile"
              className="profile-pic"
            />
            <div>
              <strong>{chat.name}</strong>
              <br />
              <small>{chat.number}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div className="chat-window">
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <strong>{selectedChat.name}</strong>
              <br />
              <small>{selectedChat.number}</small>
            </div>

            {/* Chat messages */}
            <div className="chat-messages">
              <ChatWindow chat={selectedChat} typing={typing} />
            </div>

            {/* Send message box */}
            <div className="send-box">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
              />
              <button onClick={handleSend}>Send</button>
            </div>
          </>
        ) : (
          <p>Select a chat to start messaging</p>
        )}
      </div>
    </div>
  );
}

export default App;