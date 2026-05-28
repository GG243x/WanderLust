const mongoose = require('mongoose');
const initData = require('./data.js');
const Listing = require('../models/listing.js');
const User = require('../models/user.js');
const Review = require('../models/review.js');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const path = require('path');

if (process.env.NODE_ENV !== "production") {
    require('dotenv').config({ path: path.resolve(__dirname, "../.env") });
}

const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

const MONGO_URL = process.env.ATLASDB_URL || 'mongodb://localhost:27017/wanderlust';

main().then(async () => {
    console.log('Connected to DB');
    await initDB();
    await mongoose.connection.close();
    console.log('Database connection closed.');
}).catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

// initDB clears existing database listings, creates a default owner user if not present,
// and imports sample listings while fetching dynamic map coordinates for each listing.
const initDB = async () => {
    // 1. Delete all existing listings and reviews to start with a fresh slate
    await Listing.deleteMany({});
    await Review.deleteMany({});
    
    // 2. Find or register a default "admin" owner user to assign to the sample listings.
    // This prevents "Cannot read properties of null (reading 'username')" crashes when listing details are shown.
    let adminUser = await User.findOne({ username: "admin" });
    if (!adminUser) {
        const newUser = new User({ email: "admin@gmail.com", username: "admin" });
        adminUser = await User.register(newUser, "admin123");
    }

    console.log("Geocoding sample listings... (this might take a few seconds)");
    
    // List of categories matching the options shown on the homepage
    const categories = ["Trending", "Rooms", "Iconic Cities", "Mountains", "Castles", "Pools", "Camping", "Farms", "Arctic", "Domes", "Boats"];
    
    const updatedData = [];
    // 3. Loop through all listings in data.js to assign owner, category, and geocode map coordinates
    for (let i = 0; i < initData.data.length; i++) {
        let listing = initData.data[i];
        
        // Fetch coordinates from Mapbox forward-geocoding API using listing's location and country
        let response = await geocodingClient
            .forwardGeocode({
                query: `${listing.location}, ${listing.country}`,
                limit: 1,
            })
            .send();

        // Default to New Delhi coordinates if geocoding returns no results
        let coordinates = [77.209, 28.613];
        if (response.body.features && response.body.features.length > 0) {
            coordinates = response.body.features[0].geometry.coordinates;
        }

        // Construct the final listing object and push it to updatedData
        updatedData.push({
            ...listing,
            owner: adminUser._id,
            geometry: {
                type: "Point",
                coordinates: coordinates
            },
            // Distribute categories evenly across all sample listings
            category: categories[i % categories.length]
        });
    }
    
    // 4. Save all listings to the MongoDB database
    await Listing.insertMany(updatedData);
    console.log("DB initialized with sample data");
};