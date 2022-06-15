const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const recommendedTravellerSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
        unique: true
    },
},
{timestamps: true});

module.exports = mongoose.model("RecommendedTraveller", recommendedTravellerSchema);
