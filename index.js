const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_CONNECTION_URI);

async function run() {
  //------------------------ Collections -------------------------
  const categoriesCollection = client.db('DreamCars').collection('categories');
  const productsCollection = client.db('DreamCars').collection('products');

  try {
    //------------------------ Categories -------------------------
    app.get('/categories', async (req, res) => {
      const cursor = categoriesCollection.find({});
      const categories = await cursor.toArray();
      res.send(categories);
    });
    app.get('/category/:id', async (req, res) => {
      const category = await categoriesCollection.findOne({ _id: ObjectId(req.params.id) });
      res.send(category);
    });
    //------------------------ Categories -------------------------

    //------------------------ Products -------------------------
    app.get('/products/:id', async (req, res) => {
      let cursor;
      if (req.params.id === '638088dc7d29c05a063ca3df') {
        cursor = productsCollection.find({});
      } else {
        cursor = productsCollection.find({ categoryId: req.params.id });
      }
      const products = await cursor.toArray();
      res.send(products);
    });
    //------------------------ Products -------------------------
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
