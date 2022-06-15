const { body } = require("express-validator");

exports.validatePlace = (method) => {
  switch (method) {
    //CREATE FEEDBBACK
    case "addReview": {
      return [
        body("review")
          .trim()
          .isLength({ max: 5000 })
          .withMessage("Please enter your review within 5000 characters")
          .optional({ nullable: true })
          .bail(),
        body("rating")
          .trim()
          .exists({ checkFalsy: true })
          .withMessage("Please enter your rating")
          .isInt({ min: 1, max: 5 })
          .withMessage("Please enter valid rating")
          .bail(),
      ];
    }
  }
};
