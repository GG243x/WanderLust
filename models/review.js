const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//this is a one to many relationship, one listing can have many reviews, but a review belongs to only one listing. So we will embed the review in the listing model. We will not create a separate collection for reviews, instead we will store the reviews as an array of subdocuments in the listing document.
const reviewSchema = new Schema({
    comment: String,
    rating : {
        type: Number,
        min: 1,
        max: 5,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
});

module.exports = mongoose.model("Review", reviewSchema);