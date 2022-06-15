const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Schema = mongoose.Schema;
const otpSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900, // this is the expiry time in seconds for 15 minutes
  },
});

//HASH OTP
otpSchema.pre("save", async function (next) {
  if (this.isModified("otp")) {
    this.otp = await bcrypt.hash(this.otp, 10);
  }
  next();
});

//MATCH PASSWORD
otpSchema.methods.matchOtp = async function (otp) {
  return await bcrypt.compare(otp, this.otp);
};

module.exports = mongoose.model("Otp", otpSchema);
