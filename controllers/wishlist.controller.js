const express = require("express");
const router = express.Router();

const Wishlist = require("../models/wishlist.model");
const Juice = require("../models/juice.models");
const auth = require("../middlewares/auth.middleware");


// ================= ADD TO WISHLIST =================
router.post("/add/:juiceId", auth, async (req, res) => {
  try {
    const juiceId = req.params.juiceId;

    // check juice exists
    const juice = await Juice.findById(juiceId);
    if (!juice)
      return res.status(404).json({ message: "Juice not found" });

    // check already added
    const exists = await Wishlist.findOne({
      user: req.user._id,
      juice: juiceId
    });

    if (exists)
      return res.status(400).json({
        message: "Already in wishlist"
      });

    // create
    const item = await Wishlist.create({
      user: req.user._id,
      juice: juiceId
    });

    res.status(201).json({
      message: "Added to wishlist",
      item
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ================= GET USER WISHLIST =================
router.get("/", auth, async (req, res) => {
  try {
    const list = await Wishlist.find({
      user: req.user._id
    })
      .populate("juice")
      .sort({ createdAt: -1 });

    res.json({
      count: list.length,
      wishlist: list
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ================= REMOVE FROM WISHLIST =================
router.delete("/:juiceId", auth, async (req, res) => {
  try {
    const removed = await Wishlist.findOneAndDelete({
      user: req.user._id,
      juice: req.params.juiceId
    });

    if (!removed)
      return res.status(404).json({
        message: "Item not found in wishlist"
      });

    res.json({
      message: "Removed from wishlist"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ================= CLEAR FULL WISHLIST =================
router.delete("/clear", auth, async (req, res) => {
  try {
    await Wishlist.deleteMany({
      user: req.user._id
    });

    res.json({
      message: "Wishlist cleared"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;