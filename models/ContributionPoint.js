const mongoose = require("mongoose");

const contributionPointSchema = new mongoose.Schema({
  place: Number,
  added_place: Number,
  photo: Number,
  review: Number,
  review_200_characters: Number,
  rating: Number,
  reports: Number,
});

module.exports = mongoose.model("ContributionPoint", contributionPointSchema);
