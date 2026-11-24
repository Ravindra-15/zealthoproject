/**
 * BODY PROFILE SETTINGS — HTTP layer
 *  public:  GET /api/body-profile-config            → all 5 programs
 *           GET /api/body-profile-config/:programId → one program
 *  admin:   GET /api/admin/body-profile-config/:programId
 *           PUT /api/admin/body-profile-config/:programId  (super admin)
 */

const service = require("../services/bodyProfileConfig.service");

const send = (res, err, fallback) => {
  if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
  console.error(`[BODY PROFILE CONFIG] ${fallback}:`, err);
  return res.status(500).json({ success: false, message: fallback });
};

const getAll = async (req, res) => {
  try {
    const configs = await service.getAllConfigs();
    res.set("Cache-Control", "no-cache");
    return res.json({ success: true, data: { configs } });
  } catch (err) {
    return send(res, err, "Couldn't load the body profile settings");
  }
};

const getOne = async (req, res) => {
  try {
    const config = await service.getConfig(req.params.programId);
    res.set("Cache-Control", "no-cache");
    return res.json({ success: true, data: { config } });
  } catch (err) {
    return send(res, err, "Couldn't load the body profile settings");
  }
};

const save = async (req, res) => {
  try {
    const config = await service.saveConfig(req.params.programId, req.body, req.admin);
    return res.json({ success: true, message: "Body profile settings saved", data: { config } });
  } catch (err) {
    return send(res, err, "Couldn't save the body profile settings");
  }
};

module.exports = { getAll, getOne, save };
