const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const usageTimeSchema = new Schema(
    {
        user:{
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        appVersion: String,
        totalTime: {
            type: Number,
            default: 0,
        },  // in seconds
        deviceModelName: String,
        deviceOsName: String,
        deviceVersion: String,
        deviceType: String,
        deviceManufacturer: String,
        createdAt: {
            type: Date,
            default: Date.now(),
            expires: 15552000, // this is the expiry time in seconds for 6 months
        },
        updatedAt:{
            type: Date,
            default: Date.now(),
        }
    });

//Update updated at field on save
usageTimeSchema.pre("save", async function (next) {
    this.updatedAt = Date.now();
    next();
});


module.exports = mongoose.model("usageTime", usageTimeSchema);
