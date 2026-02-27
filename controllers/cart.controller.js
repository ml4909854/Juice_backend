const express = require("express");
const router = express.Router();

const Cart = require("../models/cart.model");
const Juice = require("../models/juice.models");
const auth = require("../middlewares/auth.middleware");


// calculate total funtion
const calculateTotals = (cart) => {
  cart.totalPrice = cart.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  // 10% discount if total >= 50000
  cart.discount = cart.totalPrice >= 50000 ? cart.totalPrice * 0.10 : 0;

  cart.finalPrice = cart.totalPrice - cart.discount;
};


// cart
router.post("/add", auth, async (req, res) => {
  try {
    const { juiceId } = req.body;
    const userId = req.user._id;

    let cart = await Cart.findOne({ user: userId });

    const juice = await Juice.findById(juiceId);
    if (!juice)
      return res.status(404).json({ message: "Juice not found" });

    if (!cart)
      cart = new Cart({ user: userId, items: [] });

    const existingItem = cart.items.find(
      item => item.juice.toString() === juiceId
    );

    if (existingItem) {
      existingItem.quantity += 1;   // default increase
    } else {
      cart.items.push({
        juice: juiceId,
        quantity: 1,               // default 1
        price: juice.price
      });
    }

    calculateTotals(cart);
    await cart.save();

    res.json({ message: "Added to cart", cart });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get cart data

router.get("/", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.juice");

    if (!cart)
      return res.json({ message: "Cart empty" });

    res.status(200).json(cart);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// update cart //
router.patch("/update/:id", auth, async (req, res) => {
  try {
    const juiceId = req.params.id;
    const { action } = req.body;   // ✅ YOU MISSED THIS

    // check juice exists
    const existingJuice = await Juice.findById(juiceId);
    if (!existingJuice) {
      return res.status(404).json({ message: "Juice not found!" });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart)
      return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      i => i.juice.toString() === juiceId
    );

    if (!item)
      return res.status(404).json({ message: "Item not found in cart" });

    // INCREASE
    if (action === "increase") {
      item.quantity += 1;
    }

    // DECREASE
    else if (action === "decrease") {
      item.quantity -= 1;

      // remove if quantity <= 0
      if (item.quantity <= 0) {
        cart.items = cart.items.filter(
          i => i.juice.toString() !== juiceId
        );
      }
    }

    else {
      return res.status(400).json({ message: "Invalid action" });
    }

    calculateTotals(cart);
    await cart.save();

    res.status(200).json({
      message: "Cart updated successfully",
      cart
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// delete item
router.delete("/remove/:juiceId", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    cart.items = cart.items.filter(
      item => item.juice.toString() !== req.params.juiceId
    );

    calculateTotals(cart);
    await cart.save();

    res.status(200).json({ message: "Item removed", cart });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// clear cart
router.delete("/clear", auth, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });

    res.status(200).json({ message: "Cart cleared" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;