const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_CONNECTION_URI);

async function run() {
  //------------------------ Collections -------------------------
  const categoriesCollection = client.db('DreamCars').collection('categories');

  try {
    app.get('/categories', async (req, res) => {
      const cursor = categoriesCollection.find({});
      const categories = await cursor.toArray();
      res.send(categories);
    });
  } finally {
  }
}

run().catch(console.log);

app.get('/', async (req, res) => {
  res.send('Drean Cars server is running');
});

app.listen(port, () => console.log(`DreamCars Server running on ${port}`));

// 637fbae37d29c05a063ca3d2
// 637fbae37d29c05a063ca3d3
// 637fbae37d29c05a063ca3d4
// 637fbae37d29c05a063ca3d5
// 637fbae37d29c05a063ca3d6
// 637fbae37d29c05a063ca3d7
// 637fbae37d29c05a063ca3d8
