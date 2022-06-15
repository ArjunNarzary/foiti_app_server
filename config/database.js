const mongoose = require("mongoose");
require("dotenv").config();

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pvnzc.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

exports.connectDatabase = () => {
  mongoose.connect(
    url,
    { useNewUrlParser: true, useUnifiedTopology: true },
    () => {
      console.log("Connected to mongoDB");
    }
  );
};
