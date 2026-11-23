/**
 * ADMIN MODULE — Broadcast Message Controller
 * Thin HTTP layer over admin.message.service.
 */

const fs = require("fs");
const path = require("path");
const messageService = require("../services/admin.message.service");

// ============================================
// 🆕 POST /api/admin/messages — create + send
// ============================================
const sendMessage = async (req, res) => {
  let uploadedImagePath = null;

  try {
    const { title, body, audienceType, programId, channels } = req.body;

    let imageUrl = null;
    let imagePath = null;
    if (req.file) {
      imageUrl = `/uploads/messages/${req.file.filename}`;
      imagePath = req.file.path;
      uploadedImagePath = imagePath;
    }

    const result = await messageService.createAndSendMessage({
      title,
      body,
      imageUrl,
      imagePath,
      audienceType,
      programId: audienceType === "customers" ? programId : null,
      channels,
      sentBy: req.admin._id,
    });

    const parts = [];
    if (channels.includes("email")) parts.push(`${result.recipientCount} by email`);
    if (channels.includes("whatsapp")) parts.push(`${result.whatsappCount} on WhatsApp`);

    return res.status(201).json({
      success: true,
      message: `Sending — ${parts.join(", ")}...`,
      data: { message: result.message, recipientCount: result.recipientCount, whatsappCount: result.whatsappCount },
    });
  } catch (err) {
    if (uploadedImagePath) {
      try {
        if (fs.existsSync(uploadedImagePath)) fs.unlinkSync(uploadedImagePath);
      } catch { }
    }
    console.error("[ADMIN SEND MESSAGE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// ============================================
// 🔢 GET /api/admin/messages/recipient-count
// ============================================
const getRecipientCount = async (req, res) => {
  try {
    const { audienceType, programId } = req.query;
    const counts = await messageService.countRecipients({ audienceType, programId });
    // `count` kept for older clients = email recipients
    return res.status(200).json({ success: true, data: { count: counts.email, ...counts } });
  } catch (err) {
    console.error("[ADMIN RECIPIENT COUNT ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to count recipients" });
  }
};

// ============================================
// 📋 GET /api/admin/messages — sent history
// ============================================
const listMessages = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await messageService.listMessages({ page, limit });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[ADMIN LIST MESSAGES ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
};

module.exports = { sendMessage, getRecipientCount, listMessages };
