// Access token is required to load and style maps from the Mapbox GL JS API
mapboxgl.accessToken = mapToken;

// Defensive check: Verify that coordinates exist and are not empty
const hasCoordinates = listing.geometry && listing.geometry.coordinates && listing.geometry.coordinates.length > 0;

// If coordinates are valid, center the map on the listing's location.
// Otherwise, default the center to New Delhi ([longitude, latitude]) to prevent a client-side crash.
const mapCenter = hasCoordinates ? listing.geometry.coordinates : [77.209, 28.613];

// Initialize a new Mapbox GL map instance inside the HTML element with id="map"
const map = new mapboxgl.Map({
    container: "map", // HTML container ID where the map should render
    style: "mapbox://styles/mapbox/streets-v12", // Mapbox style URL
    center: mapCenter, // Starting position [longitude, latitude]
    zoom: 9 // Starting zoom level (closer is higher zoom)
});

// If valid coordinates exist, place a red marker and attach a popup description to the map
if (hasCoordinates) {
    const marker = new mapboxgl.Marker({ color: "red" }) // Set marker color
      .setLngLat(listing.geometry.coordinates) // Set position of the marker
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<h4>${listing.title}</h4> <p>Exact location will be provided after booking</p>`
        ) // Configure the pop-up modal when the marker is clicked
      )
      .addTo(map); // Add marker to our map instance
} else {
    console.warn("Listing has no valid coordinates; centering map to default location.");
}