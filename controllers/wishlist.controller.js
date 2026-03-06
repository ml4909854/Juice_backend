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

    // Check if juice exists
    const juice = await Juice.findById(juiceId);
    if (!juice) {
      return res.status(404).json({ 
        success: false,
        message: "Juice not found" 
      });
    }

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
          success: false,
          message: "Item already in wishlist" 
        });
      }

      // Add new juice to items array
      wishlist.items.push({ juice: juiceId });
    }

    await wishlist.save();
    
    // Populate the juice details
    await wishlist.populate({
      path: "items.juice",
      model: "Juice"
    });

    res.status(201).json({
      success: true,
      message: "Added to wishlist",
      wishlist: wishlist.items,
      count: wishlist.items.length
    });

  } catch (err) {
    console.error("Add to wishlist error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ================= REMOVE SINGLE ITEM FROM WISHLIST =================
router.delete("/item/:juiceId", auth, async (req, res) => {
  try {
    const juiceId = req.params.juiceId;
    const userId = req.user._id;

    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({ 
        success: false,
        message: "Wishlist not found" 
      });
    }

    // Filter out the juice to remove
    const initialLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      item => item.juice.toString() !== juiceId
    );

    // Check if anything was actually removed
    if (initialLength === wishlist.items.length) {
      return res.status(404).json({
        success: false,
        message: "Item not found in wishlist"
      });
    }

    await wishlist.save();
    
    // Populate before sending response
    await wishlist.populate({
      path: "items.juice",
      model: "Juice"
    });

    res.json({
      success: true,
      message: "Removed from wishlist",
      wishlist: wishlist.items,
      count: wishlist.items.length
    });

  } catch (err) {
    console.error("Remove from wishlist error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ================= GET USER WISHLIST =================
router.get("/", auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ 
      user: req.user._id 
    }).populate({
      path: "items.juice",
      model: "Juice"
    });

    if (!wishlist) {
      return res.json({ 
        success: true,
        count: 0, 
        wishlist: [] 
      });
    }

    res.json({
      success: true,
      count: wishlist.items.length,
      wishlist: wishlist.items
    });

  } catch (err) {
    console.error("Get wishlist error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ================= CLEAR FULL WISHLIST =================
router.delete("/clear", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the wishlist and clear all items
    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found"
      });
    }

    // Clear the items array
    wishlist.items = [];
    await wishlist.save();

    res.json({
      success: true,
      message: "Wishlist cleared successfully",
      count: 0,
      wishlist: []
    });

  } catch (err) {
    console.error("Clear wishlist error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;