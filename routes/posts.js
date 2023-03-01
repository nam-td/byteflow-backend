const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const Post = require("./../models/Post");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: `uploads/` });
const fs = require("fs");
const PostModel = require("./../models/Post");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config();

router.use(express.json());
router.use(cookieParser());
// router.use("/uploads", express.static(path.join(__dirname, "uploads")));

router.get("/search", async (req, res) => {
  const page = req.query.page ? req.query.page : 0;
  const query = `.*${req.query.q}.*`;
  const resultsPerPage = 10;

  try {
    const results = await Post.find({ title: { $regex: query, $options: "i" } })
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .skip(page * resultsPerPage)
      .limit(resultsPerPage);
    res.json(results);
  } catch (err) {
    throw err;
  }
});

router.put("/viewcount/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id);
  await postDoc.update({ $inc: { viewcount: 1 } });
  res.json({ message: "viewcount +1" });
});

router
  .route("/")
  .get(async (req, res) => {
    const sortBy = req.query.sort ? req.query.sort : "normal";
    if (sortBy === "mostviewed") {
      res.json(await Post.find().sort({ viewcount: -1 }).limit(5));
    } else {
      res.json(
        await Post.find()
          .populate("author", ["username"])
          .sort({ createdAt: -1 })
          .limit(10)
      );
    }
  })
  .post(uploadMiddleware.single("file"), async (req, res) => {
    const { originalname, path } = req.file;
    const nameParts = originalname.split(".");
    const extension = nameParts[nameParts.length - 1];
    const newPath = `${path}.${extension}`;
    fs.renameSync(path, newPath);

    const { token } = req.cookies;
    jwt.verify(token, process.env.JWT_SECRET, {}, async (err, info) => {
      if (err) throw err;
      const { title, summary, content, tags } = req.body;
      const postDoc = await Post.create({
        title,
        summary,
        content,
        tags,
        cover: newPath,
        author: info.id,
      });
      res.json(postDoc);
    });
  })
  .put(uploadMiddleware.single("file"), async (req, res) => {
    let newPath = null;
    if (req.file) {
      const { originalname, path } = req.file;
      const nameParts = originalname.split(".");
      const extension = nameParts[nameParts.length - 1];
      newPath = `${path}.${extension}`;
      fs.renameSync(path, newPath);
    }
    const { token } = req.cookies;
    jwt.verify(token, process.env.JWT_SECRET, {}, async (err, info) => {
      if (err) throw err;
      const { id, title, summary, content, tags } = req.body;
      const postDoc = await Post.findById(id);
      const isAuthor =
        JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
        return res.status(400).json({ msg: `You're not the author!` });
      }
      await postDoc.update({
        title,
        summary,
        content,
        tags,
        cover: newPath ? newPath : postDoc.cover,
      });
      res.status(201).json({ msg: "Your post was updated successfully!" });
    });
  });

router.get("/tech", async (req, res) => {
  res.json(
    await Post.find({ tags: { $in: ["tech"] } })
      .populate("author", ["username"])
      .limit(10)
      .sort({ createdAt: -1 })
  );
});

router.get("/reviews", async (req, res) => {
  res.json(
    await Post.find({ tags: { $in: ["reviews"] } })
      .populate("author", ["username"])
      .limit(10)
      .sort({ createdAt: -1 })
  );
});
router.get("/science", async (req, res) => {
  res.json(
    await Post.find({ tags: { $in: ["science"] } })
      .populate("author", ["username"])
      .limit(10)
      .sort({ createdAt: -1 })
  );
});

router.get("/entertainment", async (req, res) => {
  res.json(
    await Post.find({ tags: { $in: ["entertainment"] } })
      .populate("author", ["username"])
      .limit(10)
      .sort({ createdAt: -1 })
  );
});

router
  .route("/:id")
  .get(async (req, res) => {
    const { id } = req.params;
    const postDoc = await Post.findById(id).populate("author", ["username"]);
    res.json(postDoc);
  })
  .delete(async (req, res) => {
    const { id } = req.params;
    const { token } = req.cookies;
    jwt.verify(token, process.env.JWT_SECRET, {}, async (err, info) => {
      if (err) throw err;
      const postDoc = await Post.findOne({ _id: id });
      const filePath = postDoc.cover;
      fs.unlink(filePath, () => {
        console.log("File Deleted Successfully!");
      });
      await Post.deleteOne({ _id: id });
      res.status(204).json({ msg: "Yoru post was deleted successfully!" });
    });
  });

module.exports = router;
