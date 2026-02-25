const mongoose = require("mongoose");

const juiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "detox",
        "vitamin",
        "energy",
        "protein",
        "weight-loss",
        "immunity",
        "hydration",
        "antioxidant",
        "fitness",
        "skin",
        "digestive",
      ],
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    stock: {
      type: Number,
      default: 0,
    },

    ingredients: [
      {
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: String,
          required: true,
        },
      },
    ],

    benefits: [
      {
        type: String,
      },
    ],

    images: {
      type: [String],
      validate: [(arr) => arr.length <= 6, "Maximum 6 images allowed"],
    },

    averageRating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Juice", juiceSchema);
