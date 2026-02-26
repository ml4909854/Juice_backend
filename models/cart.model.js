const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  items: [
    {
      juice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Juice",
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
      },

      price: {
        type: Number,
        required: true,
      },
    },
  ],

  totalPrice: {
    type: Number,
    default: 0,
  },

  discount: {
    type: Number,
    default: 0,
  },

  finalPrice: {
    type: Number,
    default: 0,
  }

}, { timestamps: true });

module.exports = mongoose.model("Cart", CartSchema);