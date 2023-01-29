const { body } = require("express-validator");

const allowedGender = ['male', 'female', 'other'];

exports.validateMeetup = (method) => {
    switch (method) {
        //ADD TRIP
        case "updateProfile": {
            return [
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