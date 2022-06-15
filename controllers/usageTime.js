const UsageTime = require("../models/UsageTime");


exports.setUsageTime = async (req, res) => {
    try{
        const { startSession, endSession, appVersion, authUser  } = req.body;
        if(!startSession || !endSession || !appVersion){
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        //create today's date
        const now = new Date();
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        //Calculate total time between start and end session
        let firstDate = new Date(startSession),
            secondDate = new Date(endSession),
            timeDifference = Math.abs(secondDate.getTime() - firstDate.getTime())/1000; //IN second

        // console.log("First == ", firstDate, "Second == ", secondDate);

        // console.log("Time Difference", timeDifference);


        let userSession = await UsageTime.findOne({$and :([{user: authUser._id}, {appVersion: appVersion}, {updatedAt: {$gte: todayDate}}])});
        if(!userSession){
            userSession = await UsageTime.create({
                user: authUser._id,
                appVersion: appVersion,
                totalTime: 0,
                deviceModelName: req.body.deviceModelName,
                deviceOsName: req.body.deviceOsName,
                deviceVersion: req.body.deviceVersion,
                deviceType: req.body.deviceType,
                deviceManufacturer: req.body.deviceManufacturer,
            });
        }

        userSession.totalTime += timeDifference;
        await userSession.save();
        return res.status(200).json({
            success: true,
            message: "Usage time updated successfully"
        })
    }catch(error){
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}