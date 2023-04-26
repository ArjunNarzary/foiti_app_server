const { body } = require("express-validator");

exports.validateTrip = (method) => {
    switch (method) {
        //ADD TRIP
        case "addTrip": {
            return [
                body("trip_details")
                    .trim()
                    .exists({ checkFalsy: true })
                    .withMessage("Please provide your trip details")
                    .isLength({ max: 1000 })
                    .withMessage("Please enter trip details within 1000 characters")
                    .optional({ nullable: true })
                    .bail(),
                body("start_date")
                    .trim()
                    .exists({ checkFalsy: true })
                    .withMessage("Please provide when are you travelling")
                    .bail(),
                body("end_date")
                    .trim()
                    .exists({ checkFalsy: true })
                    .withMessage("Please provide when are you travelling")
                    .bail(),
            ];
        }
    }
}