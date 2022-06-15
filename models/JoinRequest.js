const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const joinRequestSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
        },
        instagram: String,
        twitter: String,
        youtube: String,
        facebook: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        }
        
    },
    { timestamps: true }
);


module.exports = mongoose.model("JoinRequest", joinRequestSchema);
