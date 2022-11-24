const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  res.send('Drean Cars server is running');
});

app.listen(port, () => console.log(`DreamCars Server running on ${port}`));
