const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

//meddlewares
app.use(express.json());
app.use(cookieParser())
app.use(helmet());

// app.use(morgan("common"));

app.use(cors());

// app.use(expressValidator);
//Routes Imports
const user = require("./routes/user");
const image = require("./routes/image");
const post = require("./routes/post");
const place = require("./routes/place");
const feedback = require("./routes/feedback");
const updateNotification = require("./routes/updateNotification");
const inAppNotification = require("./routes/inAppNotification");
const usageTime = require("./routes/usageTime");
const versionUrl = "/api/v1";

//Use Routes
app.use(`${versionUrl}/user`, user);
app.use(`${versionUrl}/image`, image);
app.use(`${versionUrl}/post`, post);
app.use(`${versionUrl}/feedback`, feedback);
app.use(`${versionUrl}/place`, place);
app.use(`${versionUrl}/updateNotification`, updateNotification);
app.use(`${versionUrl}/usageTime`, usageTime);
app.use(`${versionUrl}/inAppNotification`, inAppNotification);

module.exports = app;
