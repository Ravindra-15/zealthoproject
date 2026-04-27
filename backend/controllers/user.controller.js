// controllers/user.controller.js

const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/responseHandler");

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
    const { dob, country, city } = req.body;

    if (!dob || !country || !city) {
      return errorResponse(res, "All fields are required", 400);
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    user.dob = dob;
    user.country = country;
    user.city = city;

    await user.save();

    return successResponse(
      res,
      {
        user: {
          dob: user.dob,
          country: user.country,
          city: user.city,
        },
      },
      "Profile completed successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};