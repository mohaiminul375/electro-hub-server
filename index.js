const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();

// test server
app.get('/', (req, res) => {
    res.send('electro-hub server is working')
})
app.listen(port, () => {
    console.log(`electro hub server is running on port ${port}`)
})