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
  const usersCollection = client.db('DreamCars').collection('users');
  const bookingsCollection = client.db('DreamCars').collection('bookings');

  try {
    //------------------------ Guards -------------------------
    function verifyJWT(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send('unauthorized access');
      }

      const token = authHeader.split(' ')[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
      });
    }

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };
    //------------------------ Guards -------------------------

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

    //------------------------ Bookings -------------------------
    app.post('/bookings', verifyJWT, async (req, res) => {
      const user = req.decoded;
      const booking = req.body;
      booking.userEmail = user.email;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });
    //------------------------ Bookings -------------------------

    //------------------------ Users -------------------------
    app.get('/users/:email', async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      if (user) {
        return res.send({ role: user.role });
      }
      res.status(404).send({ message: 'No user found' });
    });

    
    app.post('/users', async (req, res) => {
      const user = req.body;
      const savedUser = await usersCollection.findOne({ email: user.email });
      if (savedUser) {
        return res.send({ acknowledged: false });
      }
      if (!user.role) {
        user.role = 'user';
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    //------------------------ Users -------------------------

    //------------------------ Ads -------------------------
    app.get('/ads', async (req, res) => {
      res.send([]);
    });
    //------------------------ Ads -------------------------

    //------------------------ Authentication -------------------------
    app.post('/jwt', async (req, res) => {
      const email = req.body.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET);
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' });
    });
    //------------------------ Authentication -------------------------
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
