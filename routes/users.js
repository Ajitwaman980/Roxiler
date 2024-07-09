const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/CodingChallenge", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const productTransactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  dateOfSale: String,
  category: String,
  sold: Boolean,
});
const ProductTransaction = mongoose.model(
  "ProductTransaction",
  productTransactionSchema
);
