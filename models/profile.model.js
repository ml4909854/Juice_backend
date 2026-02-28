// models/profile.model.js
const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  // Personal Information
  fullName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ["male", "female", "other", "prefer-not-to-say"],
    default: "prefer-not-to-say"
  },

  // Profile Picture
  avatar: {
    type: String,
    default: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample_profile.png"
  },
  avatarPublicId: String,

  // Addresses (Multiple addresses)
  addresses: [
    {
      addressType: {
        type: String,
        enum: ["home", "work", "other"],
        default: "home"
      },
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: "India"
      },
      phone: String,
      isDefault: {
        type: Boolean,
        default: false
      }
    }
  ],

  // Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      enum: ["en", "hi", "ta", "te", "kn", "ml", "bn"],
      default: "en"
    },
    favoriteCategories: [{
      type: String,
      enum: [
        "detox", "vitamin", "energy", "protein", "weight-loss", 
        "immunity", "hydration", "antioxidant", "fitness", "skin", "digestive"
      ]
    }]
  },

  // Dietary Preferences
  dietaryPreferences: {
    isVegan: { type: Boolean, default: false },
    isSugarFree: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    allergies: [String]
  },

  // Account Statistics
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    memberSince: { type: Date, default: Date.now }
  },

  // Social Links
  socialLinks: {
    facebook: String,
    instagram: String,
    twitter: String
  }

}, { 
  timestamps: true 
});

// Virtual for full address
profileSchema.virtual('fullAddress').get(function() {
  if (!this.addresses || this.addresses.length === 0) return null;
  const defaultAddr = this.addresses.find(addr => addr.isDefault) || this.addresses[0];
  return `${defaultAddr.street}, ${defaultAddr.city}, ${defaultAddr.state} - ${defaultAddr.pincode}`;
});

module.exports = mongoose.model("Profile", profileSchema);