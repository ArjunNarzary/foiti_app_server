const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const contributionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      unique:true
    },
    photos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    photos_with_coordinates: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    added_places: [
      {
        type: Schema.Types.ObjectId,
        ref: "Place",
      },
    ],
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    review_200_characters: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    ratings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Rating",
      },
    ],
    reports: [
      {
        type: Schema.Types.ObjectId,
        ref: "Report",
      },
    ],
    edits: [
      {
        type: Schema.Types.ObjectId,
        ref: "Edit",
      },
    ],
  },
  { timestamps: true }
);

//CALCULATE TOTAL CONTRIBUTION POINTS
contributionSchema.methods.calculateTotalContribution = function () {
  let total = 0;
  total = total + this.photos.length;
  total = total + this.photos_with_coordinates.length;
  total = total + this.added_places.length;
  total = total + this.reviews.length;
  total = total + this.review_200_characters.length;
  total = total + this.ratings.length;
  total = total + this.reports.length;
  total = total + this.edits.length;
  return total;
}

module.exports = mongoose.model("Contribution", contributionSchema);
