const express = require("express");
const router = express.Router();

const { list, getPendingCount, approve, reject } = require("../controllers/admin.freeTrial.controller");
const { protectAdmin } = require("../middleware/admin.auth.middleware");

router.use(protectAdmin);

router.get("/pending-count", getPendingCount);
router.get("/", list);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);

module.exports = router;
