const path = require('path');
const express = require('express');
const productRoutes = require('./routes/productRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/products', productRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
