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
        default: false,
    },
    post_likes:{
        type: Boolean,
        default: false,
    },
    new_followers:{
        type: Boolean,
        default: false,
    },
    email_notitications:{
        type: Boolean,
        default: false,
    }
}, {timestamps: true});

module.exports = mongoose.model('Notification', notificationSchema);