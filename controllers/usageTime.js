const UsageTime = require("../models/UsageTime");
const moment = require('moment');

exports.setUsageTime = async (req, res) => {
  try {
    const { startSession, endSession, appVersion, authUser } = req.body
    if (!startSession || !endSession || !appVersion) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      })
    }

    //create today's date
    const now = new Date()
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    //Calculate total time between start and end session
    let firstDate = new Date(startSession),
      secondDate = new Date(endSession),
      timeDifference =
        Math.abs(secondDate.getTime() - firstDate.getTime()) / 1000 //IN second

    let userSession = await UsageTime.findOne({
      $and: [
        { user: authUser._id },
        { appVersion: appVersion },
        { updatedAt: { $gte: todayDate } },
      ],
    })
    if (!userSession) {
      userSession = await UsageTime.create({
        user: authUser._id,
        appVersion: appVersion,
        totalTime: 0,
        deviceModelName: req.body.deviceModelName,
        deviceOsName: req.body.deviceOsName,
        deviceVersion: req.body.deviceVersion,
        deviceType: req.body.deviceType,
        deviceManufacturer: req.body.deviceManufacturer,
      })
    }

    userSession.totalTime += timeDifference
    await userSession.save()
    return res.status(200).json({
      success: true,
      message: "Usage time updated successfully",
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
}

exports.setUsageTimeV9 = async (req, res) => {
    try{
      const { startSession, endSession, appVersion, authUser } = req.body
      if (!startSession || !endSession || !appVersion) {
        return res.status(400).json({
          success: false,
          message: "Please provide all required fields",
        })
      }
      
      let firstDate = new Date(startSession)
      let secondDate = new Date(endSession)

      //Calculate total time between start and end session
      let timeDifference =
        Math.abs(secondDate - firstDate) / 1000 //IN second

      const startDateStart = moment(firstDate).startOf("day").toDate()
      const startDateEnd = moment(firstDate).endOf("day").toDate()

      let userSession = await UsageTime.findOne({
        $and: [
          { user: authUser._id },
          // { appVersion: appVersion },
          {
            createdAt: {
              $gte: startDateStart,
              $lte: startDateEnd,
            },
          },
        ],
      })
      if (!userSession) {
        userSession = await UsageTime.create({
          user: authUser._id,
          appVersion: appVersion,
          totalTime: 0,
          deviceModelName: req.body.deviceModelName,
          deviceOsName: req.body.deviceOsName,
          deviceVersion: req.body.deviceVersion,
          deviceType: req.body.deviceType,
          deviceManufacturer: req.body.deviceManufacturer,
        })
      }

      userSession.totalTime += timeDifference;
      userSession.sessions += 1;
      await userSession.save()
      return res.status(200).json({
        success: true,
        message: "Usage time updated successfully",
      })
    }catch(error){
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

exports.getUserDoc = async (req, res) => {
  try{
    const { authUser } = req.body
    const totalDocs = await UsageTime.find({ user: authUser?._id }).countDocuments();
    let showAlert = false;
    if(totalDocs){
      if (totalDocs % 3 === 0){
      // if (totalDocs === 1){
        showAlert = true
      }
    }

    res.status(200).json({
      success: true,
      totalDocs,
      showAlert
    })

  }catch(error){
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong!"
    })
  }
}