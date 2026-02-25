
require("dotenv").config()
const express = require("express")
const Juice = require("../models/juice.models.js")
const upload = require("../middlewares/upload.middleware.js")
const auth = require("../middlewares/auth.middleware.js")
const checkRole = require("../middlewares/checkRole.middleware.js")
const ROLES = require("../constants/roles.js")
const router = express.Router()


// create Juice
router.post("/create" , auth , checkRole(ROLES.ADMIN) , upload.array("images" , 6) , async(req , res)=>{
    try {
    const { name, category, description, price, stock, ingredients, benefits } = req.body

     if(!name || !category || !description || !price){
      return res.status(400).json({message:"All required fields must be filled"})
    }

     if(!req.files || req.files.length === 0){
      return res.status(400).json({message:"At least one image required"})
    }

     const imageUrls = req.files.map(file => file.path)

     const juice = new Juice({
      name,
      category,
      description,
      price,
      stock,
      ingredients: JSON.parse(ingredients || "[]"),
      benefits: JSON.parse(benefits || "[]"),
      images: imageUrls
    })
    
     const savedJuice = await juice.save()
     res.status(201).json({message:"juice created succesfully!"})
     juice:savedJuice
    } catch (error) {
        res.status(500).json({message:"error creating juice" , error:error})
    }
})

// get all juice.
router.get("/", async(req,res)=>{
  try{
    const juices = await Juice.find().sort({createdAt:-1})
    res.status(200).json({message:"get Juices" , count:juices.length , juices:juices})
  }catch(err){
    res.status(500).json({message:"Error fetching juices"})
  }
})



// Get a single juice
router.get("/:id", async(req,res)=>{
  try{

    const juice = await Juice.findById(req.params.id)

    if(!juice){
      return res.status(404).json({message:"Juice not found"})
    }

    res.status(200).json({message:"get a single Juice" , juice:juice})

  }catch(err){
    res.status(500).json({message:"Error fetching juice"})
  }
})

// update juice
router.patch("/:id",
  auth,checkRole,
  upload.array("images",6),
  async(req,res)=>{
    try{

      const updates = req.body
      
      const existingJuice = await Juice.findById(req.params.id)
      if(!existingJuice){
        return res.status(404).json({message:"Juice not found! Invalid id"})
      }

      if(req.files && req.files.length > 0){
        updates.images = req.files.map(f=>f.path)
      }

      if(updates.ingredients)
        updates.ingredients = JSON.parse(updates.ingredients)

      if(updates.benefits)
        updates.benefits = JSON.parse(updates.benefits)

      const juice = await Juice.findByIdAndUpdate(
        req.params.id,
        updates,
        { new:true }
      )

      if(!juice)
        return res.status(404).json({message:"Juice not found"})

      res.status(200).json({message:"Juice updated", juice})

    }catch(err){
      res.status(500).json({message:"Update failed"})
    }
})


router.delete("/:id",
auth,checkRole(ROLES.ADMIN),
  async(req,res)=>{
    try{

        
    const existingJuice = await Juice.findById(req.params.id)
      if(!existingJuice){
        return res.status(404).json({message:"Juice not found! Invalid id"})
      }

      const juice = await Juice.findByIdAndDelete(req.params.id)
      if(!juice)
        return res.status(404).json({message:"Juice not found"})
      res.status(200).json({message:"Juice deleted successfully"})
    }catch(err){
      res.status(500).json({message:"Delete failed"})
    }
})
module.exports = router