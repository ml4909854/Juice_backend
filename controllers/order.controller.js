const express = require("express");
const Order = require("../models/order.model.js");
const Juice = require("../models/juice.models.js");
const auth = require("../middlewares/auth.middleware.js");
const checkRole = require("../middlewares/checkRole.middleware.js");
const ROLES = require("../constants/roles.js");

const router = express.Router();


// =========================================
// PLACE ORDER FROM CART
// =========================================
router.post("/place", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { items, address, paymentMethod } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    let total = 0;

    // check stock + calculate total
    for (let item of items) {
      const juice = await Juice.findById(item.juiceId);

      if (!juice)
        return res.status(404).json({ message: "Juice not found" });

      if (juice.stock < item.quantity)
        return res.status(400).json({
          message: `${juice.name} only ${juice.stock} left in stock`
        });

      total += juice.price * item.quantity;
    }

    const discount = total * 0.10;
    const final = total - discount;

    // deduct stock
    for (let item of items) {
      await Juice.findByIdAndUpdate(
        item.juiceId,
        { $inc: { stock: -item.quantity } }
      );
    }

    const order = await Order.create({
      user: userId,
      items,
      address,
      paymentMethod,
      totalPrice: total,
      discount,
      finalPrice: final,
      paymentStatus: "pending",
      orderStatus: "placed"
    });

    res.status(201).json({
      message: "Order placed successfully",
      order
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// =========================================
// BUY NOW (DIRECT ORDER)
// =========================================
router.post("/buy-now", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { juiceId, quantity, address, paymentMethod } = req.body;

    const juice = await Juice.findById(juiceId);
    if (!juice)
      return res.status(404).json({ message: "Juice not found" });

    if (juice.stock < quantity)
      return res.status(400).json({
        message: `Only ${juice.stock} available`
      });

    const total = juice.price * quantity;
    const discount = total * 0.10;
    const final = total - discount;

    // deduct stock
    juice.stock -= quantity;
    await juice.save();

    const order = await Order.create({
      user: userId,
      items: [{
        juiceId,
        quantity,
        price: juice.price
      }],
      address,
      paymentMethod,
      totalPrice: total,
      discount,
      finalPrice: final,
      paymentStatus: "pending",
      orderStatus: "placed"
    });

    res.status(201).json({
      message: "Order placed successfully",
      order
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// =========================================
// USER ORDER HISTORY (PAGINATION + FILTER)
// =========================================
// =========================================
// USER ORDER HISTORY (PAGINATION + FILTER)
// =========================================
// =========================================
// USER ORDER HISTORY (PAGINATION + FILTER)
// =========================================
router.get("/my-orders", auth, async (req, res) => {
  try {
    const { page = 1, limit = 5, status } = req.query;

    const filter = { user: req.user._id };
    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter)
      // ✅ Populate juice with name, price, images
      .populate({
        path: 'items.juice',
        select: 'name price images category'
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalOrders = await Order.countDocuments(filter);

    res.status(200).json({
      totalOrders,
      page: Number(page),
      totalPages: Math.ceil(totalOrders / limit),
      orders
    });

  } catch (err) {
    console.error("Order fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// GET SINGLE ORDER
// =========================================
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      // ✅ Populate juice with all fields
      .populate({
        path: 'items.juice',
        select: 'name price images category description'
      });

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== ROLES.ADMIN
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.status(200).json(order);

  } catch (err) {
    console.error("Order fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// CANCEL ORDER (USER)
// =========================================
router.patch("/cancelOrder/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not allowed" });

    order.orderStatus = "cancelled";
    await order.save();

    res.status(200).json({
      message: "Order cancelled",
      order
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// =========================================
// ADMIN — UPDATE ORDER STATUS
// =========================================
router.patch(
  "/orderStatus/:id",
  auth,
  checkRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { status } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order)
        return res.status(404).json({ message: "Order not found" });

      order.orderStatus = status;
      await order.save();

      res.status(200).json({
        message: "Order status updated",
        order
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);



// =========================================
// ADMIN — UPDATE PAYMENT STATUS
// =========================================
router.patch(
  "/paymentStatus/:id",
  auth,
  checkRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { status } = req.body;

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { paymentStatus: status },
        { new: true }
      );

      if (!order)
        return res.status(404).json({ message: "Order not found" });

      res.status(200).json(order);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);



// =========================================
// ADMIN — GET ALL ORDERS
// =========================================
router.get("/admin/all", auth, checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.juiceId", "name price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      total: orders.length,
      orders
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;