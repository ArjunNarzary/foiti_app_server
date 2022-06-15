const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const updateNotificationSchema = new Schema(
    {
        body: {
            type: String,
            required: true,
        },
        appVersion: String,
        redirectLink: String,
        forced: Boolean,
        showButton: Boolean,
        buttonText: String,
        status: {
            type: String,
            enum: ['active', 'inactive'],
        }

    },
    { timestamps: true }
);


module.exports = mongoose.model("UpdateNotification", updateNotificationSchema);
