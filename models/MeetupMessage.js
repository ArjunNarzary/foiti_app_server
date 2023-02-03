const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const MeetupMessageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    content: {
        type: String,
        trim: true
    },
    chat: {
        type: Schema.Types.ObjectId,
        ref: 'MeetupChat'
    },
    is_read: {
        type: Boolean,
        default: false
    },
    is_sent: {
        type: Boolean,
        default: true
    },
    is_delivered: Boolean,
}, {
    timestamps: true
});

module.exports = mongoose.model('MeetupMessage', MeetupMessageSchema);