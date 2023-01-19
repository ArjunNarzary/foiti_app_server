const { validationResult } = require("express-validator");



function createError(errors, validate) {
    const arrError = validate.array();
    errors[arrError[0].param] = arrError[0].msg;
    return errors;
}

exports.addTrip = async (req, res) => {
    let errors = {};
    try{
        const validate = validationResult(req);
        if (!validate.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: createError(errors, validate),
            });
        }




    }catch(error){
        console.log(error);
        errors.general = "Something went wrong";
        res.status(500).json({
            success: false,
            message: errors,
        });
    }
}