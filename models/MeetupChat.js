const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MeetupChatSchema = new Schema({
    chatName: {
        type: String,
        trim: true
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    chatUsers: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    groupAdmin: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    lastMessage: {
        type: Schema.Types.ObjectId,
        ref: "MeetupMessage",
    },
    request_receiver: {
        type: Schema.Types.ObjectId,
        ref: "User",
    }
}, {
    timestamps: true
});
module.exports = mongoose.model('MeetupChat', MeetupChatSchema);