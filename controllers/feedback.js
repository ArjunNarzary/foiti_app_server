const { validationResult } = require("express-validator");
const Feedback = require("../models/Feedback");

function createError(errors, validate) {
  const arrError = validate.array();
  errors[arrError[0].param] = arrError[0].msg;
  return errors;
}

exports.createFeedback = async (req, res) => {
  let errors = {};

  try {
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const validate = validationResult(req);
    if (!validate.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: createError(errors, validate),
      });
    }

    const { authUser, feedback } = req.body;

    const newFeedback = Feedback.create({
      userId: authUser._id,
      body: feedback,
    });

    res.status(201).json({
      success: true,
      message: "Feedback created successfully",
      data: newFeedback,
    });
  } catch (error) {
    errors.general = error.message;
    console.log(error);
    res.status(500).json({
      success: false,
      message: errors,
    });
  }
};
