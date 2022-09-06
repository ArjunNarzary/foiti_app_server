const InAppNotification = require("../models/InAppNotification");


exports.getNewInAppNotification = async (req, res) => {
    let errors = {};
    try {
        const { authUser } = req.body;
        //GET NEW NOTIFICATIONS
        const newNotification = await InAppNotification.countDocuments({ $and: [{ "user": authUser._id }, {"status": "new"}] });
        return res.status(200).json({
            success: true,
            newNotification,
        })

    } catch (error) {
        console.log(error);
        errors.general = error.message;
        res.status(500).json({
            succes: false,
            errors: errors
        });
    }
}

//View all notifications change status new to unread
exports.viewInAppNotification = async (req, res) => {
    let errors = {};
    try {
        const { authUser, skip, limit } = req.body;

        //GET NEW NOTIFICATIONS AND MARK AS UNREAD
        await InAppNotification.updateMany({ $and: [{ "user": authUser._id }, {"status": "new"}] }, { status: "unread" });

        //GET ALL NOTIFICATION
        const allNotification = await InAppNotification.find({ "user": authUser._id }).populate("post").populate('action_taken_by').sort({ createdAt: -1 }).skip(skip).limit(limit);
        if(!allNotification){
            errors.general = "No notifications found";
            return res.status(404).json({
                success: false,
                errors: errors
            });
        }
        const skipData = skip + allNotification.length;

        return res.status(200).json({
            success: true,
            allNotification,
            skipData
        })

    } catch (error) {
        console.log(error);
        errors.general = error.message;
        res.status(500).json({
            succes: false,
            errors: errors
        });
    }
}

//READ NOTIFICATION
exports.readInAppNotification = async (req, res) => {
    try{
        const { authUser, notification } = req.body;
        const appNotification = await InAppNotification.findById(notification);
        if(!appNotification){
            return res.status(404).json({
                success: false,
                message: "No notification found"
            })
        }
        if(appNotification.status !== "read"){
            if (appNotification.user.toString() !== authUser._id.toString()) {
                return res.status(404).json({
                    success: false,
                    message: "Notification not found"
                });
            }
            appNotification.status = "read";
            await appNotification.save();
        }

        return res.status(200).json({
            success: true,
            message: "Notification read"
        })
    }catch(error){
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


exports.markAllRead = async (req, res) => {
    try{
        const { authUser } = req.body;
        await InAppNotification.updateMany({ "user": authUser._id }, { status: "read" });
        return res.status(200).json({
            success: true,
            message: "All notifications read"
        })
    }catch(error){
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

//DELETE IN APP NOTIFICATION
exports.deleteInAppNotification = async (req, res) => {
    try{
        const { authUser, notification } = req.body;
        const appNotification = await InAppNotification.findById(notification);
        if(!appNotification){
            return res.status(404).json({
                success: false,
                message: "No notification found"
            })
        }

        if(appNotification.user.toString() !== authUser._id.toString()){
            return res.status(401).json({
                success: false,
                message: "You are not authorized to delete this notification"
            })
        }
        
        await appNotification.remove();
        return res.status(200).json({
            success: true,
            message: "Notification deleted"
        })
    }catch(error){
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}