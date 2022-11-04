const { body } = require("express-validator");

exports.validateComment = (method) => {
    switch (method) {
        //CREATE COMMENT
        case "validateBody": {
            return [
                body("body")
                    .trim()
                    .exists({ checkFalsy: true })
                    .withMessage("Comment body cannot be empty.")
                    .isLength({ max: 2000 })
                    .withMessage("Please write your query within 2000 characters")
                    .bail(),
            ];
        }
    }
};
