const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    new_post:{
        type: Boolean,
        default: true,
    },
    post_likes:{
        type: Boolean,
        default: true,
    },
    chat_message:{
        type: Boolean,
        default: true,
    },
    new_followers:{
        type: Boolean,
        default: true,
    },
    email_notitications:{
        type: Boolean,
        default: false,
    }
}, {timestamps: true});

module.exports = mongoose.model('Notification', notificationSchema);