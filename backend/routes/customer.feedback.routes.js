const express = require("express");
const router = express.Router();

const { getPending, submit, skip } = require("../controllers/customer.feedback.controller");
const { validateSubmitFeedback, validateAppointmentIdParam } = require("../validators/customer.feedback.validator");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/pending", getPending);
router.post("/", validateSubmitFeedback, submit);
router.post("/:appointmentId/skip", validateAppointmentIdParam, skip);

module.exports = router;
