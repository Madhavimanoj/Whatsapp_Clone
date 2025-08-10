const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

/**
 * GET all grouped messages
 */
router.get("/messages", async (req, res) => {
  try {
    const all = await Message.find().sort({ timestamp: 1 });
    const grouped = {};

    all.forEach((msg) => {
      if (!grouped[msg.wa_id]) {
        grouped[msg.wa_id] = {
          wa_id: msg.wa_id,
          name: msg.name,
          number: msg.number,
          messages: [],
        };
      }
      grouped[msg.wa_id].messages.push(msg);
    });

    res.json(Object.values(grouped));
  } catch (e) {
    console.error("GET /messages error:", e);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

/**
 * POST receive message
 */
router.post("/receive", async (req, res) => {
  try {
    const io = req.app.get("io"); // Access Socket.io instance
    const payload = req.body;

    // Save to MongoDB
    const newMsg = new Message(payload);
    await newMsg.save();

    // Emit new message to all connected clients
    io.emit("new_message", payload);

    res.json({ success: true });
  } catch (err) {
    console.error("POST /receive error:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
});

/**
 * POST update status
 */
router.post("/status", async (req, res) => {
  try {
    const io = req.app.get("io");
    const { wa_id, meta_msg_id, status } = req.body;

    await Message.updateOne({ wa_id, meta_msg_id }, { $set: { status } });

    // Emit status update
    io.emit("status_updated", { wa_id, meta_msg_id, status });

    res.json({ success: true });
  } catch (err) {
    console.error("POST /status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

module.exports = router;
