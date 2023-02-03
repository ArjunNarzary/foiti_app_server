const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MeetUpRequestSchema = new Schema(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        // sender_trip: {
        //     required: true,
        //     type: Schema.Types.ObjectId,
        //     ref: "TripPlan",
        // },
        // receiver_trip: {
        //     type: Schema.Types.ObjectId,
        //     ref: "TripPlan",
        // },
        receiver:{
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true,
            expires: 2592000000, // this is the expiry time in seconds for 30 days
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    });


//HASH PASSWORD
MeetUpRequestSchema.pre("save", async function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("MeetUpRequest", MeetUpRequestSchema);
