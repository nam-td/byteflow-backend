const express = require("express");
const mongoose = require("mongoose");
const User = require("./../models/User");
const bcrypt = require("bcrypt");
const salt = bcrypt.genSaltSync(10);
const Token = require("./../models/Token");
const sendEmail = require("./../utils/sendMail");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const router = express.Router();
dotenv.config();

router.use(cookieParser());
router.use(express.json());

router.post("/register", async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
      email,
    });
    const token = await Token.create({
      userId: userDoc._id,
      token: crypto.randomBytes(32).toString("hex"),
    });

    const url = `${process.env.BASE_URL}/${userDoc._id}/verify/${token.token}`;
    await sendEmail(userDoc.email, "Verify Email", url);
    res.status(200).json({
      msg: "Registration successful. An email has been sent to your email address, please verify!",
    });
  } catch (err) {
    res.status(400).json({ err });
  }
});

router.post("/validation", async (req, res) => {
  const { username, email } = req.body;
  if (username) {
    const userDoc = await User.find({ username: username });
    if (userDoc.length > 0) {
      return res.status(200).json({ msg: "Username is already taken." });
    } else {
      return res.status(200).json({ msg: "You can use this username." });
    }
  }
  if (email) {
    const userDoc = await User.find({ email: email });
    if (userDoc.length > 0) {
      return res
        .status(200)
        .json({ msg: "This email is already used to register." });
    }
    return res.status(200).json({ msg: "You can use this email." });
  }
});

router.post("/recover/password", async (req, res) => {
  const { email } = req.body;
  const userDoc = await User.findOne({ email: email });

  if (!userDoc) {
    return res
      .status(400)
      .json({ msg: "No account is associated with this email!" });
  } else {
    const userId = userDoc._id;
    const tokenDoc = await Token.create({
      userId: userId,
      token: crypto.randomBytes(32).toString("hex"),
    });
    const url = `${process.env.BASE_URL}/recover/password/${userId}/${tokenDoc.token}`;
    await sendEmail(
      userDoc.email,
      "Reset Password",
      `Please click the link below to reset your password.\n${url}`
    );
    res.status(200).json({
      msg: "We've just emailed you the link to reset your password.",
    });
  }
});

router.post("/recover/username", async (req, res) => {
  const { email } = req.body;
  const userDoc = await User.findOne({ email: email });

  if (!userDoc) {
    return res
      .status(400)
      .json({ msg: "No account is associated with this email!" });
  } else {
    const username = userDoc.username;
    res.status(200).json({
      msg: `Your username is ${username}`,
    });
  }
});
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    if (!userDoc.verified) {
      let tokenDoc = await Token.findOne({ userId: userDoc._id });
      if (!tokenDoc) {
        tokenDoc = await new Token({
          userId: userDoc._id,
          token: crypto.randomBytes(32).toString("hex"),
        }).save();
        const url = `${process.env.BASE_URL}/${userDoc._id}/verify/${tokenDoc.token}`;
        await sendEmail(userDoc.email, "Verify Email", url);
      }
      return res.status(400).json({
        msg: "An email has been sent to your email address, please verify your account!",
      });
    }
    jwt.sign(
      { username, id: userDoc._id },
      process.env.JWT_SECRET,
      {},
      async (err, token) => {
        if (err) throw err;

        res
          .cookie("token", token, {
            secure: true,
            httpOnly: false,
            sameSite: "none",
          })
          .status(200)
          .json({
            username: userDoc.username,
            userid: userDoc._id,
            msg: "Successfully logged in",
          });
      }
    );
  } else {
    res.status(400).json({ msg: "Wrong credentials" });
  }
});

router.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, process.env.JWT_SECRET, {}, (err, info) => {
    if (err) {
      res.status(400).json({msg: "Wrong credential"});
      console.log(err);
      throw err;
    }
    res.status(200).json(info);
  });
});

router.post("/logout", (req, res) => {
  res.cookie("token", "").json({ msg: "logged out" });
});

router
  .route("/recover/password/:userid/:token")
  .post(async (req, res) => {
    const userId = req.body.userId;
    const token = req.body.token;
    try {
      const userDoc = await User.findOne({ _id: userId });
      if (!userDoc) return res.status(400).json({ msg: "Invalid link" });
      const tokenDoc = await Token.findOne({
        userId: userDoc._id,
        token: token,
      });
      if (!tokenDoc) return res.status(400).json({ msg: "Invalid link" });
      res.status(200).json({ msg: "Allowed" });
    } catch (err) {
      res.status(500).json({ err });
    }
  })
  .put(async (req, res) => {
    const { userId, token, password } = req.body;
    try {
      const userDoc = await User.findOne({ _id: userId });
      if (!userDoc) return res.status(400).json({ msg: "Invalid link" });
      const tokenDoc = await Token.findOne({
        userId: userDoc._id,
        token: token,
      });
      if (!tokenDoc) return res.status(400).json({ msg: "Invalid link" });
      const passMatch = bcrypt.compareSync(password, userDoc.password);
      if (passMatch) {
        return res
          .status(500)
          .json({ msg: "New password can't match the current password!" });
      } else {
        await userDoc.update({
          password: bcrypt.hashSync(password, salt),
        });
        await Token.findOneAndRemove({ token: token });
        res
          .status(201)
          .json({ msg: "Your password has been reset successfully!" });
      }
    } catch (err) {
      res.status(500).json({ err });
    }
  });

router.post("/:userid/verify/:token", async (req, res) => {
  const userId = req.body.userId;
  const token = req.body.token;
  try {
    const userDoc = await User.findOne({ _id: userId });
    if (!userDoc)
      return res.status(400).json({ msg: "Invalid link, invalid user id" });
    const tokenDoc = await Token.findOne({
      userId: userDoc._id,
      token: token,
    });
    if (!tokenDoc)
      return res.status(400).json({ msg: "Invalid link, invalid token" });
    await User.findOneAndUpdate({ _id: userId }, { verified: true });
    await Token.findOneAndRemove({ token: token });
    res.status(200).json({ msg: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ err });
  }
});
module.exports = router;
