const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const feedbackSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    body: {
      type: String,
      required: true,
      maxlength: [1000, "Please write your feedback within 1000 characters"],
    },
    viewed: {
      type: Boolean,
      default: false,
    },
    viewer: [
      {
        member: { type: Schema.Types.ObjectId, ref: "FoitiTeam" },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
