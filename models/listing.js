const mongoose = require('mongoose');
const Review = require('./review');
const Schema = mongoose.Schema;

// A Schema defines the structure of documents (records) within our MongoDB collection.
const listingSchema = new Schema({
    title: {
        type: String,
        required: true, // Title is required for every listing
    },
    description: String,
    image: {
        url: String,
        filename: String,
    },
    price: Number,
    location: String,
    country: String,
    // References to Review IDs stored in a separate collection.
    // This allows us to populate all reviews belonging to a specific listing.
    reviews: [
    {
        type: Schema.Types.ObjectId,
        ref: "Review",
    },
    ],
    // Reference to the User ID of the owner of this listing
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    // GeoJSON format is a standard way to store geographical coordinates in MongoDB.
    // It enables Mapbox to easily read and display the listing's coordinates.
    geometry: {
        type: {
            type: String,
            enum: ['Point'], // The GeoJSON type must be a "Point"
            required: true
        },
        coordinates: {
            type: [Number], // Stored as [longitude, latitude]
            required: true
        }
    },
    // Category field to classify listings, allowing users to filter listings on the homepage.
    category: {
        type: String,
        enum: ["Trending", "Rooms", "Iconic Cities", "Mountains", "Castles", "Pools", "Camping", "Farms", "Arctic", "Domes", "Boats"],
        required: true
    }
});

// Middleware: Automatically deletes all reviews associated with a listing when the listing is deleted.
listingSchema.post("findOneAndDelete", async (listing) =>{
    if(listing){
        await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
});

const Listing = mongoose.model('Listing', listingSchema);
module.exports = Listing;