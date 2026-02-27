const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user:{
    type: mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true
  },

  juice:{
    type: mongoose.Schema.Types.ObjectId,
    ref:"Juice",
    required:true
  },

  rating:{
    type:Number,
    required:true,
    min:1,
    max:5
  },

  comment:{
    type:String,
    trim:true
  },

  images:{
    type:[String],
    validate:[arr => arr.length <= 5 , "Max 5 images allowed"]
  }

},{timestamps:true});


// prevent duplicate reviews
reviewSchema.index({ user:1 , juice:1 } , { unique:true });

module.exports = mongoose.model("Review",reviewSchema);