// controllers/admin.controller.js
const express = require("express");
const router = express.Router();

const User = require("../models/user.model");
const Order = require("../models/order.model");
const Juice = require("../models/juice.models");
const Review = require("../models/review.model");

const auth = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/checkRole.middleware");
const ROLES = require("../constants/roles");


// ==========================================
// ADMIN DASHBOARD STATS
// ==========================================
router.get("/dashboard", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    // Basic counts
    const users = await User.countDocuments();
    const orders = await Order.countDocuments();
    const juices = await Juice.countDocuments();
    const reviews = await Review.countDocuments();

    // Revenue from delivered orders
    const revenueData = await Order.aggregate([
      { $match: { orderStatus: "delivered" } },
      { $group: { _id: null, total: { $sum: "$finalPrice" } } }
    ]);
    const revenue = revenueData[0]?.total || 0;

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
    ]);

    // Recent orders (last 5)
    const recentOrders = await Order.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .limit(5);

    // Top selling juices
    const topJuices = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.juice", totalSold: { $sum: "$items.quantity" } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      { $lookup: { from: "juices", localField: "_id", foreignField: "_id", as: "juice" } }
    ]);

    res.json({
      users,
      orders,
      juices,
      reviews,
      revenue,
      ordersByStatus,
      recentOrders,
      topJuices
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// GET ALL USERS (with pagination & search)
// ==========================================
router.get("/users", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    
    const query = search
      ? { $or: [{ username: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] }
      : {};

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      users
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// UPDATE USER ROLE
// ==========================================
router.patch("/users/:id/role", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (![ROLES.ADMIN, ROLES.USER].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    res.json({ message: "User role updated", user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// DELETE USER
// ==========================================
router.delete("/users/:id", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// GET ALL ORDERS (with pagination & filters)
// ==========================================
router.get("/orders", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentStatus, search = "" } = req.query;
    
    const query = {};
    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    if (search) {
      query.$or = [
        { "items.name": { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } }
      ];
    }

    const orders = await Order.find(query)
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    res.json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      orders
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// UPDATE ORDER STATUS
// ==========================================
router.patch("/orders/:id/status", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["placed", "processing", "shipped", "delivered", "cancelled"];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateData = { orderStatus: status };
    if (status === "delivered") updateData.deliveredAt = new Date();
    if (status === "cancelled") updateData.cancelledAt = new Date();

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("user", "username email");

    res.json({ message: "Order status updated", order });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// UPDATE PAYMENT STATUS
// ==========================================
router.patch("/orders/:id/payment", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "paid", "failed"];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: status },
      { new: true }
    ).populate("user", "username email");

    res.json({ message: "Payment status updated", order });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// GET ALL JUICES (with pagination)
// ==========================================
router.get("/juices", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search = "" } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: "i" };

    const juices = await Juice.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Juice.countDocuments(query);

    res.json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      juices
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// CREATE JUICE
// ==========================================
router.post("/juices", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const juiceData = req.body;
    const juice = new Juice(juiceData);
    await juice.save();
    res.status(201).json({ message: "Juice created", juice });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// UPDATE JUICE
// ==========================================
router.patch("/juices/:id", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const juice = await Juice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ message: "Juice updated", juice });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// DELETE JUICE
// ==========================================
router.delete("/juices/:id", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    await Juice.findByIdAndDelete(req.params.id);
    res.json({ message: "Juice deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// GET ALL REVIEWS
// ==========================================
router.get("/reviews", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find()
      .populate("user", "username email")
      .populate("juice", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Review.countDocuments();

    res.json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      reviews
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// DELETE REVIEW
// ==========================================
router.delete("/reviews/:id", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;