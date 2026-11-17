// controllers/user.controller.js

const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const { checkPostalCode } = require("../utils/postalCode");

// Step 1
exports.updateProfileStepOne = async (req, res) => {
  try {
    const { fullName, nickName } = req.body;

    if (!fullName || !nickName) {
      return errorResponse(res, "All fields are required", 400);
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    user.fullName = fullName;
    user.nickName = nickName;

    await user.save();

    return successResponse(
      res,
      {
        user: {
          fullName: user.fullName,
          nickName: user.nickName,
        },
      },
      "Profile step 1 updated"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Step 2
exports.updateProfileStepTwo = async (req, res) => {
  try {
    const { dob, country, countryIso, state, city, pincode } = req.body;

    if (!dob || !country || !state || !city) {
      return errorResponse(res, "All fields are required", 400);
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    user.dob = dob;
    user.country = country;
    user.countryIso = countryIso || "";
    user.state = state;
    user.city = city;
    user.pincode = pincode || ""; // already validated + normalised by validateProfileStep2

    await user.save();

    return successResponse(
      res,
      {
        user: {
          dob: user.dob,
          country: user.country,
          countryIso: user.countryIso,
          state: user.state,
          city: user.city,
          pincode: user.pincode,
        },
      },
      "Profile completed successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
// 📮 Live pincode check for the profile forms (while the user types).
// Always 200 — `valid` says whether it passed; `verified` means India Post
// confirmed it (false when only the format could be checked).
exports.checkPincode = async (req, res) => {
  try {
    const { countryIso, state, pincode } = req.query;
    const result = await checkPostalCode({
      countryIso: typeof countryIso === "string" ? countryIso : "",
      state: typeof state === "string" ? state : "",
      pincode: typeof pincode === "string" ? pincode : "",
    });
    return successResponse(
      res,
      result.ok
        ? {
            valid: true,
            pincode: result.pincode,
            verified: result.verified,
            district: result.district || "",
            state: result.state || "",
          }
        : { valid: false, message: result.message },
      "Pincode checked"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
