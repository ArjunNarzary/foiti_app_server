const { body } = require("express-validator");

const allowedGender = ['male', 'female', 'other'];

exports.validateMeetup = (method) => {
    switch (method) {
        //ADD TRIP
        case "updateProfile": {
            return [
                body("about_me")
                    .trim()
                    .exists({ checkFalsy: true })
                    .withMessage("Please write little about yourself")
                    .isLength({ max: 1000 })
                    .withMessage("\"About Me\" must be within 1000 characters.")
                    .bail(),
                body("gender")
                    .trim()
                    .exists({ checkFalsy: true })
                    .withMessage("Please select gender")
                    .custom((value) => allowedGender.includes(value))
                    .withMessage("Please select a gender")
                    .bail(),
                body("dob")
                    .exists({ checkFalsy: true })
                    .withMessage("Enter your date of birth")
                    .bail(),
            ];
        }
    }
}