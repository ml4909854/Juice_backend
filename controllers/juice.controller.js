require("dotenv").config();
const express = require("express");
const Juice = require("../models/juice.models.js");
const upload = require("../middlewares/upload.middleware.js");
const auth = require("../middlewares/auth.middleware.js");
const checkRole = require("../middlewares/checkRole.middleware.js");
const ROLES = require("../constants/roles.js");

const router = express.Router();


// create juice

router.post(
  "/create",
  auth,
  checkRole(ROLES.ADMIN),
  upload.array("images", 6),
  async (req, res) => {
    try {
      let juiceData = req.body;
      
      // if data in json format parse it.
      if (req.body.data) {
        juiceData = JSON.parse(req.body.data);
      }

      // check all fileds
      if (!juiceData.name || !juiceData.category || !juiceData.description || !juiceData.price) {
        return res.status(400).json({ 
          message: "All required fields must be filled",
          received: juiceData // Debug 
        });
      }

      // handle image urls 
      const imageUrls = req.files ? req.files.map(file => file.path) : [];

      // if indegrients are string. then parse It
      if (juiceData.ingredients && typeof juiceData.ingredients === 'string') {
        juiceData.ingredients = JSON.parse(juiceData.ingredients);
      }

      // if benifits string parse it.
      if (juiceData.benefits && typeof juiceData.benefits === 'string') {
        juiceData.benefits = JSON.parse(juiceData.benefits);
      }

      const juice = new Juice({
        name: juiceData.name,
        category: juiceData.category,
        description: juiceData.description,
        price: juiceData.price,
        stock: juiceData.stock || 0,
        ingredients: juiceData.ingredients || [],
        benefits: juiceData.benefits || [],
        images: imageUrls
      });

      const savedJuice = await juice.save();

      res.status(201).json({
        message: "Juice created successfully!",
        juice: savedJuice
      });

    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ 
        message: "Error creating juice", 
        error: error.message 
      });
    }
  }
);

// get all juices
router.get("/", async (req, res) => {
  try {
    const juices = await Juice.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "Juices fetched successfully",
      count: juices.length,
      juices
    });

  } catch (err) {
    res.status(500).json({ message: "Error fetching juices" });
  }
});


// search + filter + pagination
router.get("/search/filter", async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 8
    } = req.query;

    let query = {};

    // 🔍 search
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // 📂 category
    if (category) {
      query.category = category;
    }

    // 💰 price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // 📊 sorting
    let sortOption = {};
    if (sort === "price_asc") sortOption.price = 1;
    if (sort === "price_desc") sortOption.price = -1;
    if (sort === "new") sortOption.createdAt = -1;
    if (sort === "rating") sortOption.averageRating = -1;

    const juices = await Juice.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Juice.countDocuments(query);

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      juices
    });

  } catch (err) {
    res.status(500).json({ message: "Search failed" });
  }
});


// get single juice
router.get("/:id", async (req, res) => {
  try {
    const juice = await Juice.findById(req.params.id);

    if (!juice)
      return res.status(404).json({ message: "Juice not found" });

    res.status(200).json({
      message: "Juice fetched successfully",
      juice
    });

  } catch (err) {
    res.status(500).json({ message: "Error fetching juice" });
  }
});


// update juice
router.patch(
  "/:id",
  auth,
  checkRole(ROLES.ADMIN),
  upload.array("images", 6),
  async (req, res) => {
    try {
      const updates = req.body;

      const existingJuice = await Juice.findById(req.params.id);
      if (!existingJuice) {
        return res.status(404).json({ message: "Juice not found! Invalid id" });
      }

      if (req.files && req.files.length > 0) {
        updates.images = req.files.map(f => f.path);
      }

      if (updates.ingredients)
        updates.ingredients = JSON.parse(updates.ingredients);

      if (updates.benefits)
        updates.benefits = JSON.parse(updates.benefits);

      const juice = await Juice.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );

      res.status(200).json({
        message: "Juice updated successfully",
        juice
      });

    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  }
);


// delete juice
router.delete(
  "/:id",
  auth,
  checkRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const juice = await Juice.findByIdAndDelete(req.params.id);

      if (!juice)
        return res.status(404).json({ message: "Juice not found" });

      res.status(200).json({
        message: "Juice deleted successfully"
      });

    } catch (err) {
      res.status(500).json({ message: "Delete failed" });
    }
  }
);


module.exports = router;