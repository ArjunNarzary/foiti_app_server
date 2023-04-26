const mongoose = require("mongoose");

const metTravellerSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        travellers: [
            {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
    },
    { timestamps: true } 
);

module.exports = mongoose.model("MetTraveller", metTravellerSchema);
