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
    phone: String,           // ✅ Added phone number
    alternatePhone: String,  // ✅ Added alternate phone (optional)
    addressType: {           // ✅ Added address type
      type: String,
      enum: ["home", "work", "other"],
      default: "home"
    },
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

  // Delivery tracking
  estimatedDelivery: {
    type: Date,
    default: () => new Date(+new Date() + 30*60000) // 30 minutes from now
  },
  deliveredAt: Date,
  cancelledAt: Date,

  // Pricing
  totalPrice: Number,
  discount: Number,
  finalPrice: Number,
  
  // Coupon applied
  appliedCoupon: {
    code: String,
    discount: Number
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);