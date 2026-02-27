const express = require("express");
const router = express.Router();

const Review = require("../models/review.model");
const Order = require("../models/order.model");
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const updateRating = require("../utils/updateRating");


// ================= ADD REVIEW =================
router.post("/:juiceId", auth, upload.array("images",5), async(req,res)=>{
try{

 const { rating , comment } = req.body;
 const juiceId = req.params.juiceId;

 // check user bought this juice
 const hasOrdered = await Order.findOne({
   user:req.user._id,
   "items.juice":juiceId,
   orderStatus:"delivered"
 });

 if(!hasOrdered)
  return res.status(403).json({
   message:"You can review only purchased juice"
  });

 // image upload
 const images = req.files?.map(f=>f.path) || [];

 // create review
 const review = await Review.create({
  user:req.user._id,
  juice:juiceId,
  rating,
  comment,
  images
 });

 await updateRating(juiceId);

 res.status(201).json({
  message:"Review added",
  review
 });

}catch(err){
 res.status(500).json({error:err.message});
}
});



// ================= GET REVIEWS =================
router.get("/:juiceId", async(req,res)=>{
try{

 const reviews = await Review.find({
  juice:req.params.juiceId
 })
 .populate("user","username avatar")
 .sort({createdAt:-1});

 res.json(reviews);

}catch(err){
 res.status(500).json({error:err.message});
}
});



// ================= UPDATE REVIEW =================
router.patch("/:id", auth, upload.array("images",5), async(req,res)=>{
try{

 const review = await Review.findOne({
  _id:req.params.id,
  user:req.user._id
 });

 if(!review)
  return res.status(404).json({message:"Review not found"});

 if(req.body.rating) review.rating=req.body.rating;
 if(req.body.comment) review.comment=req.body.comment;

 if(req.files.length>0)
  review.images = req.files.map(f=>f.path);

 await review.save();
 await updateRating(review.juice);

 res.json(review);

}catch(err){
 res.status(500).json({error:err.message});
}
});



// ================= DELETE REVIEW =================
router.delete("/:id", auth, async(req,res)=>{
try{

 const review = await Review.findOneAndDelete({
  _id:req.params.id,
  user:req.user._id
 });

 if(!review)
  return res.status(404).json({message:"Review not found"});

 await updateRating(review.juice);

 res.json({message:"Review deleted"});

}catch(err){
 res.status(500).json({error:err.message});
}
});

module.exports = router;