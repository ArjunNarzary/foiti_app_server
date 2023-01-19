const { body } = require("express-validator");

exports.validateTrip = (method) => {
    switch (method) {
        //ADD TRIP
        case "addTrip": {
            return [
                body("details")
                    .trim()
                    .exists({ checkFalsy: true })
                    .withMessage("Please provide your trip details")
                    .isLength({ max: 1000 })
                    .withMessage("Please enter trip details within 1000 characters")
                    .optional({ nullable: true })
                    .bail(),
            ];
        }
    }
}