const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");

const router = express.Router();

// Database connection
try {
  mongoose.connect("mongodb://localhost:27017/CodingChallenge", {});
  console.log("Connected to MongoDB");
} catch (err) {
  console.error("Connection error:", err);
}

// Database schema and model
const productTransactionSchema = new mongoose.Schema({
  id: Number,
  title: String,
  price: Number,
  description: String,
  category: String,
  image: String,
  sold: Boolean,
  dateOfSale: String,
});

const ProductTransaction = mongoose.model(
  "ProductTransaction",
  productTransactionSchema
);

// Initialize the database with seed data
router.get("/initialize", async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    const data = response.data;
    await ProductTransaction.deleteMany({});
    await ProductTransaction.insertMany(data);
    res.send("Database initialized with seed data.");
  } catch (error) {
    console.error("Error initializing database:", error);
    res.status(500).send("Error initializing database.");
  }
});

// Fetch transactions
router.get("/transactions", async function (req, res) {
  const { month, search, page = 1, perPage = 10 } = req.query;
  try {
    const monthFilter = { dateOfSale: { $regex: new RegExp(`-0?${month}-`) } };
    let filter = monthFilter;

    if (search) {
      const searchFilter = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { price: { $regex: search, $options: "i" } },
        ],
      };
      filter = { ...monthFilter, ...searchFilter };
    }

    const transactions = await ProductTransaction.find(filter)
      .skip((page - 1) * perPage)
      .limit(perPage);
    res.send(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).send("Error fetching transactions.");
  }
});

// Fetch statistics
router.get("/statistics", async function (req, res) {
  const month = req.query.month;
  try {
    const monthFilter = { dateOfSale: { $regex: new RegExp(`-0?${month}-`) } };

    const totalSaleAmount = await ProductTransaction.aggregate([
      { $match: monthFilter },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    const totalSoldItems = await ProductTransaction.countDocuments({
      ...monthFilter,
      sold: true,
    });
    const totalNotSoldItems = await ProductTransaction.countDocuments({
      ...monthFilter,
      sold: false,
    });

    let totalAmount = 0;
    if (totalSaleAmount.length > 0) {
      totalAmount = totalSaleAmount[0].total;
    }

    res.status(200).send({
      totalSaleAmount: totalAmount,
      totalSoldItems: totalSoldItems,
      totalNotSoldItems: totalNotSoldItems,
    });
  } catch (err) {
    console.error("Error fetching statistics:", err);
    res.status(500).send("Error fetching statistics.");
  }
});

// Fetch bar chart data
router.get("/bar_chart", async function (req, res) {
  const month = req.query.month;
  try {
    const monthFilter = { dateOfSale: { $regex: new RegExp(`-0?${month}-`) } };
    const priceRanges = [
      { range: "0 - 100", min: 0, max: 100 },
      { range: "101 - 200", min: 101, max: 200 },
      { range: "201 - 300", min: 201, max: 300 },
      { range: "301 - 400", min: 301, max: 400 },
      { range: "401 - 500", min: 401, max: 500 },
      { range: "501 - 600", min: 501, max: 600 },
      { range: "601 - 700", min: 601, max: 700 },
      { range: "701 - 800", min: 701, max: 800 },
      { range: "801 - 900", min: 801, max: 900 },
      { range: "901 - above", min: 901, max: Infinity },
    ];

    const barChartData = await Promise.all(
      priceRanges.map(async ({ range, min, max }) => {
        const count = await ProductTransaction.countDocuments({
          ...monthFilter,
          price: { $gte: min, $lte: max },
        });
        return { range, count };
      })
    );

    res.status(200).send(barChartData);
  } catch (error) {
    console.error("Error fetching bar chart data:", error);
    res.status(500).send("Error fetching bar chart data.");
  }
});

// Fetch pie chart data
router.get("/pie_chart", async function (req, res) {
  const month = req.query.month;
  try {
    const monthFilter = { dateOfSale: { $regex: new RegExp(`-0?${month}-`) } };

    const pieChartData = await ProductTransaction.aggregate([
      { $match: monthFilter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const pieData = pieChartData.map(({ _id, count }) => ({
      category: _id,
      count,
    }));

    res.status(200).send(pieData);
  } catch (error) {
    console.error("Error fetching pie chart data:", error);
    res.status(500).send("Error fetching pie chart data.");
  }
});

// Fetch combined data
router.get("/combined_data", async function (req, res) {
  const month = req.query.month;
  console.log(month);

  try {
    const transactionsResponse = await axios.get(
      `http://localhost:3000/transactions?month=${month}`
    );
    const statisticsResponse = await axios.get(
      `http://localhost:3000/statistics?month=${month}`
    );
    const barChartResponse = await axios.get(
      `http://localhost:3000/bar_chart?month=${month}`
    );
    const pieChartResponse = await axios.get(
      `http://localhost:3000/pie_chart?month=${month}`
    );

    const transactions = transactionsResponse.data;
    const statistics = statisticsResponse.data;
    const barChart = barChartResponse.data;
    const pieChart = pieChartResponse.data;
    const combinedData = {
      transactions: transactions,
      statistics: statistics,
      barChart: barChart,
      pieChart: pieChart,
    };

    res.render("index.ejs", { combinedData: combinedData });
  } catch (e) {
    console.log(e);
    res.status(500).send("Error fetching combined data.");
  }
});

module.exports = router;
