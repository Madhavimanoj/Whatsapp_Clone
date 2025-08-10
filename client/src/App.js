import React, { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Socket connection with secure configuration
const socket = io(API_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

function App() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    fetchMessages();

    // Handle socket events
    socket.on("new_message", (msg) => {
      setChats((prevChats) => {
        const updated = [...prevChats];
        const chat = updated.find((c) => c.wa_id === msg.wa_id);

        if (chat) {
          const alreadyExists = chat.messages.some(
            (m) => m.meta_msg_id === msg.meta_msg_id
          );
          if (!alreadyExists) chat.messages.push(msg);
        } else {
          updated.push({
            wa_id: msg.wa_id,
            name: msg.name,
            number: msg.number,
            messages: [msg],
          });
        }
        return updated;
      });
    });

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

    socket.on("user_typing", (wa_id) => {
      if (selectedChat?.wa_id === wa_id) {
        setTyping(true);
        setTimeout(() => setTyping(false), 1500);
      }
    });

    return () => {
      socket.off("new_message");
      socket.off("status_updated");
      socket.off("user_typing");
    };
  }, [selectedChat?.wa_id]);

  const fetchMessages = () => {
    axios
      .get(`${API_URL}/webhook/messages`)
      .then((res) => setChats(res.data))
      .catch((err) => console.error("Failed to fetch messages:", err));
  };

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
      setNewMessage("");
    } catch (err) {
      console.error("Message sending failed:", err);
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        {chats.map((chat, i) => (
          <div
            key={i}
            className={`chat-item ${
              selectedChat?.wa_id === chat.wa_id ? "selected" : ""
            }`}
            onClick={() => setSelectedChat(chat)}
          >
            <img src="/images/profile.png" alt="Profile" className="profile-pic" />
            <div>
              <strong>{chat.name}</strong>
              <br />
              <small>{chat.number}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="chat-window">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <strong>{selectedChat.name}</strong>
              <br />
              <small>{selectedChat.number}</small>
            </div>
            <div className="chat-messages">
              <ChatWindow chat={selectedChat} typing={typing} />
            </div>
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