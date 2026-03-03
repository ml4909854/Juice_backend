// controllers/payment.controller.js
const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const auth = require("../middlewares/auth.middleware");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================================
// CREATE ORDER
// ==========================================
router.post("/create-order", auth, async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        email: req.user.email
      }
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create payment order",
      error: error.message 
    });
  }
});

// ==========================================
// VERIFY PAYMENT
// ==========================================
router.post("/verify-payment", auth, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    // Create signature for verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    // Verify signature
    if (expectedSignature === razorpay_signature) {
      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        paymentId: razorpay_payment_id,
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: "Invalid payment signature" 
      });
    }

  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Payment verification failed",
      error: error.message 
    });
  }
});

// ==========================================
// GET PAYMENT DETAILS (OPTIONAL)
// ==========================================
router.get("/payment-details/:paymentId", auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);
    
    res.status(200).json({
      success: true,
      payment
    });

  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch payment details",
      error: error.message 
    });
  }
});

// ==========================================
// REFUND PAYMENT (OPTIONAL - FOR ADMIN)
// ==========================================
router.post("/refund/:paymentId", auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount } = req.body;

    // Create refund
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100 // Convert to paise if partial refund
    });

    res.status(200).json({
      success: true,
      message: "Refund initiated successfully",
      refund
    });

  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process refund",
      error: error.message 
    });
  }
});

module.exports = router;