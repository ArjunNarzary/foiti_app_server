const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const placeLocationViewerSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  place: {
    type: Schema.Types.ObjectId,
    ref: "Place",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

//update date
placeLocationViewerSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("PlaceLocationViewer", placeLocationViewerSchema);
