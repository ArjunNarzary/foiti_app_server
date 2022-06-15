const { body } = require("express-validator");

exports.validateFeedback = (method) => {
  switch (method) {
    //CREATE FEEDBBACK
    case "createFeedback": {
      return [
        body("feedback")
          .trim()
          .exists({ checkFalsy: true })
          .withMessage("Please write your feedback")
          .isLength({ min: 50 })
          .withMessage(
            "Please write your feedback with more than 50 characters"
          )
          .isLength({ max: 4000 })
          .withMessage("Please write your feedback within 4000 characters")
          .bail(),
      ];
    }
  }
};
