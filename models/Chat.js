const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = new Schema({
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
        ref: "Message",
    }
}, {
    timestamps: true
});
module.exports = mongoose.model('Chat', chatSchema);