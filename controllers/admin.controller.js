const express = require("express");
const router = express.Router();

const User = require("../models/user.model");
const Order = require("../models/order.model");
const Juice = require("../models/juice.models");

const auth = require("../middlewares/auth.middleware");
const checkRole = require("../middlewares/checkRole.middleware");
const ROLES = require("../constants/roles");


// ==========================================
// ADMIN DASHBOARD STATS
// ==========================================
router.get("/dashboard", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {

    const users = await User.countDocuments();
    const orders = await Order.countDocuments();
    const juices = await Juice.countDocuments();

    const revenueData = await Order.aggregate([
      { $match: { orderStatus: "delivered" } },
      { $group: { _id: null, total: { $sum: "$finalPrice" } } }
    ]);

    const revenue = revenueData[0]?.total || 0;

    res.json({
      users,
      orders,
      juices,
      revenue
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// GET ALL USERS
// ==========================================
router.get("/users", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {

    const users = await User.find().select("-password");

    res.json({
      count: users.length,
      users
    });

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
// GET ALL ORDERS
// ==========================================
router.get("/orders", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {

    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      count: orders.length,
      orders
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// UPDATE ORDER STATUS
// ==========================================
router.patch("/orders/:id", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {

    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );

    res.json({
      message: "Order updated",
      order
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// GET ALL JUICES
// ==========================================
router.get("/juices", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {

    const juices = await Juice.find().sort({ createdAt: -1 });

    res.json({
      count: juices.length,
      juices
    });

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



module.exports = router;