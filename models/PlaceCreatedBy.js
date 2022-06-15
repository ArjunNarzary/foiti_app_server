const mongoose = require("mongoose");

const placeCreatedBySchema = new mongoose.Schema(
  {
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "PlaceCreatedBy",
  placeCreatedBySchema,
  "placecreatedby"
);
