const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
  const reportsCollection = client.db('DreamCars').collection('reports');
  const paymentsCollection = client.db('DreamCars').collection('payments');

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

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'seller') {
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
    app.post('/products', verifyJWT, verifySeller, async (req, res) => {
      const user = req.decoded;
      const product = req.body;
      product.userEmail = user.email;
      product.status = 'unsold';
      product.advertise = false;
      product.createdAt = new Date(Date.now());
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.patch('/products/:id', verifyJWT, verifySeller, async (req, res) => {
      const user = req.decoded;
      const query = {
        _id: ObjectId(req.params.id),
        userEmail: user.email,
      };
      const updatedDoc = {
        $set: {
          advertise: req.body.advertise,
        },
      };
      const result = await productsCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.get('/products/seller/:sellerEmail', async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.sellerEmail, role: 'seller' });
      if (!user) {
        return res.status(404).send({ message: 'No Seller Found' });
      }
      const cursor = productsCollection.find({ userEmail: user.email });
      const products = await cursor.toArray();
      res.send(products);
    });

    app.get('/products/:id', async (req, res) => {
      let cursor;
      if (req.params.id === '638088dc7d29c05a063ca3df') {
        cursor = productsCollection.find({ status: 'unsold' });
      } else {
        cursor = productsCollection.find({ categoryId: req.params.id, status: 'unsold' });
      }
      const products = await cursor.toArray();
      res.send(products);
    });

    app.get('/products/find/:id', async (req, res) => {
      const product = await productsCollection.findOne({ _id: ObjectId(req.params.id) });
      res.send(product);
    });

    app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
      const user = req.decoded;
      const id = req.params.id;
      const query = { _id: ObjectId(id), userEmail: user.email };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });
    //------------------------ Products -------------------------

    //------------------------ Bookings -------------------------
    app.post('/bookings', verifyJWT, async (req, res) => {
      const user = req.decoded;
      const booking = req.body;
      booking.userEmail = user.email;
      booking.status = 'unpaid';
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get('/bookings/:email', async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      if (!user) {
        return res.status(404).send({ message: 'No User Found' });
      }
      const cursor = bookingsCollection.find({ userEmail: user.email });
      const products = await cursor.toArray();
      res.send(products);
    });

    app.get('/bookings/find/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });
    //------------------------ Bookings -------------------------

    //------------------------ Payments -------------------------
    app.post('/create-payment-intent', async (req, res) => {
      const booking = req.body;
      const price = parseInt(booking.price);
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        payment_method_types: ['card'],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'paid',
          transactionId: payment.transactionId,
        },
      };
      bookingsCollection.updateOne(filter, updatedDoc);
      productsCollection.updateOne(
        {
          _id: ObjectId(payment.productId),
        },
        {
          $set: {
            status: 'sold',
          },
        }
      );
      res.send(result);
    });
    //------------------------ Payments -------------------------

    //------------------------ Users -------------------------
    app.get('/users/:email', async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      if (user) {
        return res.send({ role: user.role });
      }
      res.status(404).send({ message: 'No user found' });
    });

    app.get('/users/verified/:email', async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      if (user) {
        return res.send({ verified: user.verified });
      }
      res.status(404).send({ message: 'No user found' });
    });

    app.get('/users/all/buyers', async (req, res) => {
      const cursor = usersCollection.find({ role: 'user' });
      const users = await cursor.toArray();
      res.send(users);
    });

    app.get('/users/all/sellers', async (req, res) => {
      const cursor = usersCollection.find({ role: 'seller' });
      const users = await cursor.toArray();
      res.send(users);
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
      user.verified = false;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/sellers/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const query = {
        email: req.params.email,
        role: 'seller',
      };
      const updatedDoc = {
        $set: {
          verified: req.body.verified,
        },
      };
      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const user = await usersCollection.findOne({ _id: ObjectId(req.params.id) });
      productsCollection.deleteMany({ userEmail: user.email });
      const query = { _id: ObjectId(req.params.id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    //------------------------ Users -------------------------

    //------------------------ Ads -------------------------
    app.get('/ads', async (req, res) => {
      const cursor = productsCollection.find({ advertise: true, status: 'unsold' });
      const products = await cursor.toArray();
      res.send(products);
    });
    //------------------------ Ads -------------------------

    //------------------------ Reports -------------------------
    app.get('/reports', async (req, res) => {
      const cursor = reportsCollection.find({});
      const reports = await cursor.toArray();
      res.send(reports);
    });

    app.post('/reports', verifyJWT, async (req, res) => {
      const user = req.decoded;
      const report = req.body;
      const existingReport = await reportsCollection.findOne({
        productId: report.productId,
        userEmail: user.email,
      });
      if (existingReport) {
        return res.send({ message: 'Product already reported' });
      }
      report.userEmail = user.email;
      const result = await reportsCollection.insertOne(report);
      res.send(result);
    });

    app.delete('/reports', verifyJWT, verifyAdmin, async (req, res) => {
      const productQuery = { _id: ObjectId(req.body.productId) };
      const reportQuery = { _id: ObjectId(req.body.reportId) };

      const productResult = await productsCollection.deleteOne(productQuery);
      const reportResult = await reportsCollection.deleteOne(reportQuery);

      res.send({ productResult, reportResult });
    });
    //------------------------ Reports -------------------------

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
