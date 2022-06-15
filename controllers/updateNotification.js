const UpdateNotification = require("../models/UpdateNotification");


exports.setUpdateNotification = async (req, res) => {
    try{
        const { body, appVersion, redirectLink, forced, showButton, buttonText } = req.body;
        await UpdateNotification.create({
            body,
            appVersion,
            redirectLink,
            forced,
            showButton,
            buttonText,
            status: "active"
        });

        res.status(200).json({
            success: true,
            message: "Update Notification created successfully"
        })
    }catch(error){
        res.status(500).json({
            success: true,
            message: error.message
        })
    }
    
}

exports.getUpdateNotification = async (req, res) => {
    try{
        const updateNotification = await UpdateNotification.findOne({status: "active"});
        res.status(200).json({
            success: true,
            updateNotification
        })
    }catch(error){
        res.status(500).json({
            success: true,
            message: error.message
        })
    }
}