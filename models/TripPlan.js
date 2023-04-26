const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const pointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        default: "Point",
    },
    coordinates: {
        type: [Number], // Array of arrays of arrays of numbers
    }
});

const TripPlanSchema = new Schema(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        address:{},
        address_location:{
            type: pointSchema,
            index: '2dsphere', // Create a special 2dsphere index
            sparse: true
        },
        destination:{},
        destination_location:{
            type: pointSchema,
            index: '2dsphere', // Create a special 2dsphere index
            sparse: true
        },
        start_date: {
            type:Date,
            required: [true, "Please provide travelling date"],
        },
        end_date: {
            type: Date,
            required: [true, "Please provide travelling date"],
            expires: 0
        },
        details:{
            type: String,
            required: [true, "Please provide little about your trip"],
            maxlength:[1000, "Details should be within 1000 characters"]
        },
        co_travellers: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
        meetup_status: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["silent", "active", "terminated"],
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("TripPlan", TripPlanSchema);
