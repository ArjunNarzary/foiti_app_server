const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const reviewSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    place_id: {
      type: Schema.Types.ObjectId,
      ref: "Place",
    },
    body: {
      type: String,
      maxlength: 5000,
    },
    rating: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
