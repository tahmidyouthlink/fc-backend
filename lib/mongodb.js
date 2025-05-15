// db.js
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n9or6wr.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

async function connectDB() {
  if (!db || !client.topology?.isConnected()) {
    try {
      await client.connect();
      db = client.db("fashion-commerce");
      console.log("✅ MongoDB connected");

      client.on('close', () => {
        console.error("❌ MongoDB connection closed");
        db = null;
      });

      client.on('error', (err) => {
        console.error("❌ MongoDB client error:", err.message);
      });

    } catch (err) {
      console.error("❌ MongoDB connection failed:", err.message);
      process.exit(1);
    }
  }
  return db;
}

module.exports = connectDB;