const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const ratingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rating", ratingSchema);
