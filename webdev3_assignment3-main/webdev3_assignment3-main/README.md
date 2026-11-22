# Inventory and Data Management System

A REST API and simple web interface for managing a product catalogue, built with Node.js, Express, MongoDB, Mongoose and dotenv.

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and set your MongoDB connection string. It can point to a local MongoDB server or a MongoDB Atlas cluster.

   ```
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/inventory_db
   ```

3. Add the sample products (optional):

   ```
   npm run seed
   ```

   `npm run seed` does nothing if products already exist. `npm run seed:reset` deletes all products and reloads the samples.

4. Start the server:

   ```
   npm start
   ```

5. Open `http://localhost:5000`, using the port from your `.env`.

## API

Base URL: `/api/products`

| Method | Route | Description |
| --- | --- | --- |
| POST | `/` | Create a product |
| GET | `/` | List products with filtering, sorting and pagination |
| GET | `/:id` | Get one product |
| PUT | `/:id` | Update product details |
| PATCH | `/:id/stock` | Restock or record a sale, e.g. `{ "change": 10 }` or `{ "change": -3 }` |
| DELETE | `/:id` | Delete a product |
| GET | `/low-stock` | Products at or below their reorder level |
| GET | `/summary` | Inventory totals by category |

### Query parameters for `GET /`

| Parameter | Example | Description |
| --- | --- | --- |
| `search` | `chair` | Matches name, SKU or supplier |
| `category` | `Furniture` | Exact category |
| `supplier` | `ikea` | Partial supplier match |
| `minPrice`, `maxPrice` | `500`, `5000` | Price range |
| `stock` | `in`, `low`, `out` | Stock status |
| `sort` | `-price` | `name`, `sku`, `category`, `price`, `quantity` or `createdAt`. Prefix with `-` for descending |
| `page`, `limit` | `2`, `10` | Pagination. `limit` can be up to 100 |

Example: `GET /api/products?category=Electronics&minPrice=1000&sort=-price&page=1&limit=5`

### Sample product

```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```

## Project structure

```
config/        MongoDB connection
controllers/   Request logic and aggregation pipelines
middleware/    Input validation and centralized error handling
models/        Mongoose schema
public/        Web interface
routes/        API routes
utils/         Shared error class
app.js         Express app
server.js      Entry point
seed.js        Sample data
```
