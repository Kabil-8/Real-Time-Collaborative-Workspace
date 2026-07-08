const mongoose = require("mongoose");

async function connectDB() {
  mongoose.set("strictQuery", true);
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is required");
  await mongoose.connect(uri);
  console.log("[db] connected");
}

module.exports = connectDB;