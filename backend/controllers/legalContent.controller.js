/**
 * LEGAL PAGES & DISCLAIMERS — HTTP layer
 *  public:  GET /api/legal-content/:programId         → what the customer app shows
 *  admin:   GET /api/admin/legal-content/:programId   → same, fresh, + the originals
 *           PUT /api/admin/legal-content/:programId   → save (super admin)
 */

const service = require("../services/legalContent.service");
const { defaultLegal } = require("../utils/legalDefaults");

const send = (res, err, fallback) => {
  if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
  console.error(`[LEGAL CONTENT] ${fallback}:`, err);
  return res.status(500).json({ success: false, message: fallback });
};

const getPublic = async (req, res) => {
  try {
    const content = await service.getContent(req.params.programId);
    res.set("Cache-Control", "no-cache");
    return res.json({ success: true, data: { content } });
  } catch (err) {
    return send(res, err, "Couldn't load this page");
  }
};

const getForAdmin = async (req, res) => {
  try {
    const { content } = await service.getFresh(req.params.programId);
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, data: { content, originals: defaultLegal(req.params.programId) } });
  } catch (err) {
    return send(res, err, "Couldn't load the legal pages");
  }
};

const save = async (req, res) => {
  try {
    const content = await service.saveContent(req.params.programId, req.body, req.admin);
    return res.json({ success: true, message: "Legal pages & disclaimers saved", data: { content } });
  } catch (err) {
    return send(res, err, "Couldn't save the legal pages");
  }
};

module.exports = { getPublic, getForAdmin, save };
