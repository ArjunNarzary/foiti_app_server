const { validationResult } = require("express-validator");
const { sendSupportEmail } = require("../utils/sentEmail");
function createError(errors, validate) {
    const arrError = validate.array();
    errors[arrError[0].param] = arrError[0].msg;
    return errors;
}

exports.createHelpSupport = async(req, res) => {
    let errors = {};
    try{
        const validate = validationResult(req);
        if (!validate.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: createError(errors, validate),
            });
        }
        const { authUser, query  } = req.body;

        const html = `<div style="padding: 1.5rem; margin:1.5rem;">
                      <p>${query}</p>
                  </div>`;

        //SEND EMAIL
        try {
            await sendSupportEmail({
                from: "Foiti - Help and Support <inapp-helpandsupport@foiti.com>",
                email: "support@foiti.com",
                subject: "In-App Help and Support",
                user: authUser.email,
                html,
            });

            return res.status(201).json({
                success: true,
                message: "We have received your query. Our support team will get back to you as soon as possible",
            });
        } catch (error) {
            console.log(error.message);
            errors.general = "Something went wrong while sending email";
            await otp.deleteOne();
            return res.status(500).json({
                success: false,
                message: errors,
            });
        }


    }catch(error){
        errors.general ="We couldn't send your query at this moment. Please try again."
        return res.status(500).json({
            success:false,
            message: errors,
        })
    }
}