const Listing = require("../models/listing")
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

// 1. Index Route: Fetches and displays all listings, supporting search and categories filtering
module.exports.index = async (req, res) => {  
  let { q, category } = req.query; // Extracts query parameters from URL (e.g., ?q=Berlin or ?category=Pools)
  let query = {};
  
  // Search logic: Searches location, country, or title with a case-insensitive regular expression
  if (q) {
    query = {
      $or: [
        { location: { $regex: q, $options: "i" } },
        { country: { $regex: q, $options: "i" } },
        { title: { $regex: q, $options: "i" } }
      ]
    };
  } 
  // Category logic: Filters listings by chosen category
  else if (category) {
    query = { category: category };
  }

  const allListings = await Listing.find(query); // Find listings in MongoDB
  res.render("listings/index.ejs", { allListings }); // Render index page with data
}

// 2. Render New Form Route: Displays the form to create a new listing
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
}

// 3. Show Listing Route: Displays detailed information about a single listing
module.exports.showListing = async (req, res) => {
  let { id } = req.params; // Get Listing ID from request parameters
  // Fetch listing and populate its reviews, reviews' authors, and listing's owner
  const listing = await Listing.findById(id).populate( { path: "reviews", populate: { path: "author" } } ).populate("owner");
  if(!listing) {
    req.flash("error", "The Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  console.log(listing);
  res.render("listings/show.ejs", { listing }); // Render detail view
}

// 4. Create Listing Route: Saves a newly created listing to MongoDB
module.exports.createListing = async (req, res, next) => {
    // Call Mapbox to convert listing location (text) to coordinates
    let response = await geocodingClient
      .forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
      })
      .send();

    // If location is invalid and Mapbox returns no coordinates, display a message and redirect
    if (!response.body.features || response.body.features.length === 0) {
      req.flash("error", "Invalid location! Could not find map coordinates.");
      return res.redirect("/listings/new");
    }

    let url = req.file.path; // Image URL from cloud storage (Cloudinary)
    let filename = req.file.filename; // Image file identifier
    const newListing = new Listing(req.body.listing); // Create Mongoose Listing document
    newListing.owner = req.user._id; // Set current user as owner
    newListing.image = {url, filename}; // Save image details

    newListing.geometry = response.body.features[0].geometry; // Save Mapbox coordinates

    let savedListing = await newListing.save(); // Save to database
    console.log(savedListing);
    req.flash("success", "New Listing Created!"); // Set flash success message
    res.redirect("/listings"); // Redirect back to index
}

// 5. Render Edit Form Route: Fetches and displays a form to update an existing listing
module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id); // Find listing to edit
  if(!listing) {
    req.flash("error", "The Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  // Optimize image dimensions for preview in edit form
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
}

// 6. Update Listing Route: Saves modified listing fields to MongoDB
module.exports.updateListing = async (req, res) => {
  let { id } = req.params;

  // Re-geocode the location to update map coordinates
  let response = await geocodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();

  if (!response.body.features || response.body.features.length === 0) {
    req.flash("error", "Invalid location! Could not find map coordinates.");
    return res.redirect(`/listings/${id}/edit`);
  }

  // Update listing properties and geometry coordinates
  let listing = await Listing.findByIdAndUpdate(id, { 
    ...req.body.listing,
    geometry: response.body.features[0].geometry
  }, { new: true, runValidators: true });

  // If a new image file was uploaded, update image details
  if(typeof req.file !== "undefined"){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = {url, filename};
    await listing.save();
  }

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`); // Redirect back to detail page
}

// 7. Destroy Listing Route: Removes a listing from MongoDB
module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id); // Delete from DB (associated reviews will be deleted by model middleware)
  console.log(deletedListing);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
}