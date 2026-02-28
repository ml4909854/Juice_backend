// routes/profile.routes.js
const express = require("express");
const router = express.Router();
const Profile = require("../models/profile.model");
const User = require("../models/user.model");
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const cloudinary = require("../utils/cloudinary");

// =========================================
// GET PROFILE
// =========================================
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    let profile = await Profile.findOne({ user: userId })
      .populate("user", "username email role");

    if (!profile) {
      // Create default profile if doesn't exist
      const user = await User.findById(userId);
      
      profile = new Profile({
        user: userId,
        fullName: user.username,
        stats: {
          memberSince: user.createdAt
        }
      });
      
      let savedProfile = await profile.save();
      return res.status(200).json({ 
        message: "Profile created successfully", 
        profile: savedProfile 
      });
    }

    res.status(200).json({ 
      message: "Profile fetched successfully", 
      profile 
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching profile", 
      error: error.message 
    });
  }
});

// =========================================
// UPDATE PROFILE
// =========================================
router.patch("/", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.user;
    delete updates.stats;
    delete updates._id;

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ 
        message: "Profile not found" 
      });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      profile
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error updating profile", 
      error: error.message 
    });
  }
});

// =========================================
// UPLOAD AVATAR
// =========================================
router.post("/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ 
        message: "No image uploaded" 
      });
    }

    // Get existing profile to delete old avatar
    const existingProfile = await Profile.findOne({ user: userId });
    
    // Delete old avatar from cloudinary if exists
    if (existingProfile?.avatarPublicId) {
      await cloudinary.uploader.destroy(existingProfile.avatarPublicId);
    }

    // Upload new avatar
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "profiles",
      width: 300,
      height: 300,
      crop: "fill",
      format: "webp"
    });

    // Update profile with new avatar
    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      {
        avatar: result.secure_url,
        avatarPublicId: result.public_id
      },
      { new: true }
    );

    res.status(200).json({
      message: "Avatar uploaded successfully",
      avatar: result.secure_url,
      profile
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error uploading avatar", 
      error: error.message 
    });
  }
});

// =========================================
// ADD ADDRESS
// =========================================
router.post("/addresses", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const newAddress = req.body;

    // If this is the first address or isDefault is true, update other addresses
    if (newAddress.isDefault) {
      await Profile.updateOne(
        { user: userId, "addresses.isDefault": true },
        { $set: { "addresses.$.isDefault": false } }
      );
    }

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $push: { addresses: newAddress } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ 
        message: "Profile not found" 
      });
    }

    res.status(201).json({
      message: "Address added successfully",
      addresses: profile.addresses
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error adding address", 
      error: error.message 
    });
  }
});

// =========================================
// UPDATE ADDRESS
// =========================================
router.patch("/addresses/:addressId", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.addressId;
    const updates = req.body;

    // If setting this address as default, remove default from others
    if (updates.isDefault) {
      await Profile.updateOne(
        { user: userId, "addresses.isDefault": true },
        { $set: { "addresses.$.isDefault": false } }
      );
    }

    const profile = await Profile.findOneAndUpdate(
      { 
        user: userId, 
        "addresses._id": addressId 
      },
      { 
        $set: { 
          "addresses.$": { ...updates, _id: addressId }
        } 
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ 
        message: "Address not found" 
      });
    }

    res.status(200).json({
      message: "Address updated successfully",
      addresses: profile.addresses
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error updating address", 
      error: error.message 
    });
  }
});

// =========================================
// DELETE ADDRESS
// =========================================
router.delete("/addresses/:addressId", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.addressId;

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { 
        $pull: { 
          addresses: { _id: addressId } 
        } 
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ 
        message: "Profile not found" 
      });
    }

    res.status(200).json({
      message: "Address deleted successfully",
      addresses: profile.addresses
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error deleting address", 
      error: error.message 
    });
  }
});

// =========================================
// UPDATE PREFERENCES
// =========================================
router.patch("/preferences", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const preferences = req.body;

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: { preferences } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ 
        message: "Profile not found" 
      });
    }

    res.status(200).json({
      message: "Preferences updated successfully",
      preferences: profile.preferences
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error updating preferences", 
      error: error.message 
    });
  }
});

// =========================================
// GET PROFILE STATS
// =========================================
router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await Profile.findOne({ user: userId })
      .select("stats");

    if (!profile) {
      return res.status(404).json({ 
        message: "Profile not found" 
      });
    }

    res.status(200).json({
      message: "Stats fetched successfully",
      stats: profile.stats
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching stats", 
      error: error.message 
    });
  }
});

module.exports = router;