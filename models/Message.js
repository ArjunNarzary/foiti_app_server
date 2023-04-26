const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const messageSchema = new Schema({
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
        ref: 'Chat' 
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

module.exports = mongoose.model('Message', messageSchema);