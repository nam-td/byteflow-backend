const express = require("express");
const app = express();
const path = require('path');
const cors = require('cors');
const mongoose = require("mongoose");
const authenticationRouter = require('./routes/authentication');
const postsRouter = require('./routes/posts');
const dotenv = require("dotenv");
dotenv.config();
mongoose.connect(process.env.MONGO_URL);

app.use(cors({
  credentials: true,
  origin: process.env.BASE_URL,
}));
app.set("trust proxy", 1);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/authentication", authenticationRouter);
app.use("/posts", postsRouter);


if (process.env.PORT){
  app.listen(process.env.PORT || 4000);
}

