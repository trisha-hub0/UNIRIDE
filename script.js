/* =====================================================
   UniRide Shared Script (frontend-only)
   - Storage keys handled: uniride_user_final_v1, uniride_user
   - Rides stored in: uniride_rides
   - Bookings stored in: uniride_bookings
   ===================================================== */

const USER_KEY_NEW = "uniride_user_final_v1";
const USER_KEY_OLD = "uniride_user";
const RIDES_KEY = "uniride_rides";
const BOOKINGS_KEY = "uniride_bookings";

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject("File read error");
    fr.readAsDataURL(file);
  });
}

function getStoredUser() {
  const u = JSON.parse(localStorage.getItem(USER_KEY_NEW) || "null") || JSON.parse(localStorage.getItem(USER_KEY_OLD) || "null");
  return u;
}

function saveUser(user) {
  localStorage.setItem(USER_KEY_NEW, JSON.stringify(user));
}

function ensureLoggedIn(redirect = true) {
  const user = getStoredUser();
  if (!user && redirect) {
    window.location.href = "login.html";
  }
  return user;
}

function getRides() {
  try {
    return JSON.parse(localStorage.getItem(RIDES_KEY) || "[]");
  } catch (e) { return []; }
}
function saveRides(rides) {
  localStorage.setItem(RIDES_KEY, JSON.stringify(rides));
}
function getBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "[]"); } catch(e){ return []; }
}
function saveBookings(b) { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(b)); }

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("uniride_darkmode", document.body.classList.contains("dark") ? "1" : "0");
}

// helper to get fare
function getFixedFare(pickup, drop) {
  const routes = {
    "College Gate-RR Gate": 40,
    "College Gate-Global Mall": 50,
    "College Gate-Jnana Bharathi": 45,
    "College Gate-Uttarahalli": 35,
    "RR Gate-Global Mall": 30,
    "RR Gate-Uttarahalli": 25,
    // symmetric entries can be handled by falling to default
  };
  const key = `${pickup}-${drop}`;
  return routes[key] || 40;
}

// Decrement seats by 1, create booking record with OTP
function bookRideById(id) {
  const user = ensureLoggedIn();
  if (!user) return;
  const rides = getRides();
  const idx = rides.findIndex(r => String(r.id) === String(id));
  if (idx === -1) { alert("Ride not found"); return; }
  const ride = rides[idx];
  if (Number(ride.seats) <= 0) { alert("No seats available"); return; }

  const otp = Math.floor(1000 + Math.random() * 9000);
  // decrement
  ride.seats = Number(ride.seats) - 1;
  if (ride.seats <= 0) ride.booked = true;
  // record passenger info
  ride.lastBookedBy = user.email;
  saveRides(rides);

  const bookings = getBookings();
  const booking = {
    id: "b_" + Date.now(),
    rideId: ride.id,
    passengerName: user.name,
    passengerEmail: user.email,
    passengerPhone: user.phone,
    otp,
    createdAt: Date.now()
  };
  bookings.push(booking);
  saveBookings(bookings);

  alert(`✅ Ride booked successfully!\nYour OTP: ${otp}\nShow this OTP to the driver when picked up.`);
  // allow caller UI to refresh (pages call search again)
}

// Cancel ride posted by driver (removes it)
function cancelRideById(id) {
  const user = ensureLoggedIn();
  if (!user) return;
  let rides = getRides();
  const ride = rides.find(r => String(r.id) === String(id));
  if (!ride) { alert("Ride not found"); return; }
  if (ride.email !== user.email) {
    alert("You can only cancel rides you posted.");
    return;
  }
  if (!confirm("Confirm cancel this ride?")) return;
  rides = rides.filter(r => String(r.id) !== String(id));
  saveRides(rides);
  alert("Ride cancelled.");
}

// Cancel booking (passenger cancels) — restores seat on the ride
function cancelBookingById(bookingId) {
  const user = ensureLoggedIn();
  if (!user) return;
  let bookings = getBookings();
  const bidx = bookings.findIndex(b => String(b.id) === String(bookingId));
  if (bidx === -1) { alert("Booking not found"); return; }
  const booking = bookings[bidx];
  if (booking.passengerEmail !== user.email) {
    alert("You can only cancel your own bookings.");
    return;
  }
  // restore seat on ride
  const rides = getRides();
  const rIdx = rides.findIndex(r => String(r.id) === String(booking.rideId));
  if (rIdx !== -1) {
    rides[rIdx].seats = Number(rides[rIdx].seats) + 1;
    rides[rIdx].booked = false;
    saveRides(rides);
  }
  bookings = bookings.filter(b => String(b.id) !== String(bookingId));
  saveBookings(bookings);
  alert("Booking cancelled.");
}

// Verify OTP provided by rider/driver
function verifyOtpForRide(rideId, enteredOtp) {
  const bookings = getBookings();
  const booking = bookings.find(b => String(b.rideId) === String(rideId));
  if (!booking) return false;
  return String(booking.otp) === String(enteredOtp);
}

/* Expose a few helpers globally for inline page scripts */
window.uniride = {
  fileToDataURL,
  getStoredUser,
  saveUser,
  ensureLoggedIn,
  getRides,
  saveRides,
  getBookings,
  saveBookings,
  getFixedFare,
  bookRideById,
  cancelRideById,
  cancelBookingById,
  verifyOtpForRide,
  toggleDarkMode
};