const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const inAppNotificationSchema = new Schema({
    user:{
        type: Schema.Types.ObjectId,
        ref: "User",
        require: true,
    },
    post:{
        type: Schema.Types.ObjectId,
        ref: "Post",
    },
    action_taken_by:{
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    message:String,
    type:{
        type: String,
        enum: ["like", "new_post", "follow"],
    },
    status: {
        type: String,
        enum: ["new", "unread", "read"],
        default: "new",
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        expires: 7776000, // this is the expiry time in seconds for 3 months
    },
    updatedAt: {
        type: Date,
        default: Date.now(),
    }

});

//Update updated at field on save
inAppNotificationSchema.pre("save", async function (next) {
    this.updatedAt = Date.now();
    next();
});


module.exports = mongoose.model("InAppNotification", inAppNotificationSchema);