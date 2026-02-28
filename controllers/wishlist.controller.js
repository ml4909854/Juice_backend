const express = require("express");
const router = express.Router();

const Wishlist = require("../models/wishlist.model");
const Juice = require("../models/juice.models");
const auth = require("../middlewares/auth.middleware");

// ================= ADD TO WISHLIST =================
router.post("/add/:juiceId", auth, async (req, res) => {
  try {
    const juiceId = req.params.juiceId;
    const userId = req.user._id;

    // check juice exists
    const juice = await Juice.findById(juiceId);
    if (!juice)
      return res.status(404).json({ message: "Juice not found" });

    // Find user's wishlist or create new one
    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      // Create new wishlist with first item
      wishlist = new Wishlist({
        user: userId,
        items: [{ juice: juiceId }]
      });
    } else {
      // Check if juice already in wishlist
      const exists = wishlist.items.some(item => 
        item.juice.toString() === juiceId
      );

      if (exists) {
        return res.status(400).json({ 
          message: "Already in wishlist" 
        });
      }

      // Add new juice to items array
      wishlist.items.push({ juice: juiceId });
    }

    await wishlist.save();

    res.status(201).json({
      message: "Added to wishlist",
      wishlist
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= REMOVE FROM WISHLIST =================
router.delete("/:juiceId", auth, async (req, res) => {
  try {
    const juiceId = req.params.juiceId;
    const userId = req.user._id;

    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({ 
        message: "Wishlist not found" 
      });
    }

    // Remove juice from items array
    wishlist.items = wishlist.items.filter(
      item => item.juice.toString() !== juiceId
    );

    await wishlist.save();

    res.json({
      message: "Removed from wishlist",
      wishlist
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GET USER WISHLIST =================
router.get("/", auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ 
      user: req.user._id 
    }).populate("items.juice");

    if (!wishlist) {
      return res.json({ 
        count: 0, 
        wishlist: [] 
      });
    }

    res.json({
      count: wishlist.items.length,
      wishlist: wishlist.items
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