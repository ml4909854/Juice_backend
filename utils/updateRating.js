const Review = require("../models/review.model");
const Juice = require("../models/juice.models");

const updateRating = async (juiceId)=>{

 const stats = await Review.aggregate([
   { $match:{ juice: juiceId } },
   {
     $group:{
       _id:"$juice",
       avg:{ $avg:"$rating" },
       count:{ $sum:1 }
     }
   }
 ])

 await Juice.findByIdAndUpdate(juiceId,{
   averageRating: stats[0]?.avg || 0,
   reviewCount: stats[0]?.count || 0
 });

};

module.exports = updateRating; updateRating.js