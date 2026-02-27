
const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [
    {
      juice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Juice"
      },
      name: String,
      price: Number,
      quantity: Number,
      subtotal: Number
    }
  ],

  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: "India"
    }
  },

  paymentMethod: {
    type: String,
    enum: ["cod", "upi", "credit-card", "debit-card"],
    required: true
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending"
  },

  orderStatus: {
    type: String,
    enum: ["placed", "processing", "shipped", "delivered", "cancelled"],
    default: "placed"
  },

  totalPrice: Number,
  discount: Number,
  finalPrice: Number

}, { timestamps: true });

module.exports = mongoose.model("Order" , orderSchema)