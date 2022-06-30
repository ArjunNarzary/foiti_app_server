const { body } = require("express-validator");

exports.validateHelpSupport = (method) => {
    switch (method) {
        //SEND HELP AND SUPPORT EMAIL
        case "createHelpSupport": {
            return [
                body("query")
                    .trim()
                    .exists({ checkFalsy: true })
                    .withMessage("Please write your query")
                    .isLength({ min: 50 })
                    .withMessage(
                        "Please write your query with more than 50 characters"
                    )
                    .isLength({ max: 4000 })
                    .withMessage("Please write your query within 4000 characters")
                    .bail(),
            ];
        }
    }
};
