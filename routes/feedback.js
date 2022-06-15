const express = require("express");
const { createFeedback } = require("../controllers/feedback");

const { isAuthenticated } = require("../middlewares/auth");
const {
  validateFeedback,
} = require("../middlewares/validations/feedbackValidator");

const router = express.Router();

//CREATE FEEDBBACK
router
  .route("/")
  .post(isAuthenticated, validateFeedback("createFeedback"), createFeedback);

module.exports = router;
