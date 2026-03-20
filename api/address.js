const res = await fetch("https://api.address.com/verify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
  },
  body: JSON.stringify({
    street: "123 Main St",
    city: "Salt Lake City",
    state: "UT",
    zip: "84101"
  })
});

const data = await res.json();