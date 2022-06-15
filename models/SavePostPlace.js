const mongoose = require("mongoose");

const savePostPlaceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SavePostPlace", savePostPlaceSchema);
