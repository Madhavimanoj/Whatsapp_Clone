import React, { useEffect, useState } from "react";
import axios from "axios";
import ChatWindow from "./components/ChatWindow";
import "./App.css";
import { io } from "socket.io-client";

// Directly use your Render backend URL in production
const API_URL =
  process.env.REACT_APP_API_URL || "https://chat-backend-ln6b.onrender.com";

// Socket connection
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

    socket.on("new_message", (msg) => {
      setChats((prevChats) => {
        const updated = [...prevChats];
        const existing = updated.find((c) => c.wa_id === msg.wa_id);

        if (existing) {
          const alreadyExists = existing.messages.some(
            (m) => m.meta_msg_id === msg.meta_msg_id
          );
          if (!alreadyExists) {
            existing.messages.push(msg);
          }
        } else {
          updated.push({
            wa_id: msg.wa_id,
            name: msg.name,
            number: msg.number,
            messages: [msg],
          });
        }
        return [...updated];
      });
    });

    socket.on("status_updated", (updatedMsg) => {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.wa_id === updatedMsg.wa_id) {
            const newMessages = chat.messages.map((msg) =>
              msg.meta_msg_id === updatedMsg.meta_msg_id
                ? { ...msg, status: updatedMsg.status }
                : msg
            );
            return { ...chat, messages: newMessages };
          }
          return chat;
        })
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
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setChats(res.data);
        } else {
          setChats([
            {
              wa_id: "123456",
              name: "Demo User",
              number: "+911234567890",
              messages: [
                {
                  meta_msg_id: "demo1",
                  message: "Welcome! No real messages yet.",
                  timestamp: new Date(),
                  status: "delivered",
                  direction: "incoming",
                },
              ],
            },
          ]);
        }
      })
      .catch((err) => {
        console.error(err);
        setChats([
          {
            wa_id: "error1",
            name: "Mia",
            number: "+911234567890",
            messages: [
              {
                meta_msg_id: "error-msg",
                message: "Hello Madhavi.",
                timestamp: new Date(),
                status: "failed",
                direction: "incoming",
              },
            ],
          },
        ]);
      });
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
      meta_msg_id: "msg_" + Date.now(),
      direction: "outgoing",
    };

    try {
      await axios.post(`${API_URL}/webhook/receive`, payload);
      setNewMessage("");
    } catch (err) {
      console.error("Send failed:", err);
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
          <div
            className="chat-messages"
            style={{ padding: "20px", textAlign: "center" }}
          >
            <p>Select a chat</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
