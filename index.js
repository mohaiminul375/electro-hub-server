const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
// middleware
app.use(express.json());
app.use(cors({
    origin: [
        "http://localhost:3000",
    ]
}))


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ixszr3u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        // collection
        const userCollection = client.db('electro-hub').collection('users');
        const productsCollection = client.db('electro-hub').collection('all-products');

        // manage all user
        // get all users
        app.get('/all-users', async (req, res) => {
            try {
                const result = await userCollection.find({}, { projection: { password: 0 } }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch users', error });
            }
        });

        // delete user
        app.delete('/all-users/:id', async (req, res) => {
            try {
                const userId = req.params.id;
                console.log(userId)
                const query = { _id: new ObjectId(userId) }
                console.log(query)
                const result = await userCollection.deleteOne(query)
                res.send(result);
            }
            catch (error) {
                res.status(500).send({ message: 'An error occurred while deleting the user.' });
            }
        })

        // login with email password
        app.post('/login', async (req, res) => {
            const user = req.body;
            console.log(user)
            const query = { email: user.email };
            const existedUser = await userCollection.findOne(query);
            // Check if the user exists
            if (!existedUser) {
                return res.status(404).json({ message: "User not found" });
            }
            const passwordMatched = await bcrypt.compare(user.password, existedUser.password);
            // Check if the password matched
            if (!passwordMatched) {
                return res.status(401).json({ message: "Invalid password" });
            }
            // Successful login
            return res.status(200).json({ message: "Login successful", user: existedUser });
        });
        //    social login
        app.post('/social-login', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const isExisted = await userCollection.findOne(query);
            if (isExisted) {
                return res.status(200).json({ message: 'User already exists' });
            }
            else {
                const result = await userCollection.insertOne({ ...user, role: 'user' });
                res.status(201).json({ message: 'User created successfully', result });
            }
        })

        // post user
        app.post('/users', async (req, res) => {
            const user_info = req.body;
            const query = { email: user_info.email };
            // Check if user already exists
            const existed = await userCollection.findOne(query);
            if (existed) {
                return res.status(409).json({ message: 'User already exists' }); // 409 Conflict status for existing resource
            }
            // hashed password
            const hashedPass = bcrypt.hashSync(user_info.password, 10);
            // Insert new user
            const result = await userCollection.insertOne({ ...user_info, password: hashedPass, role: 'user' });
            return res.status(201).send(result); // Send success response with 201 Created status
        });

        // admin-dashboard
        // manage products
        // get products for admin
        app.get('/all-products-admin', async (req, res) => {
            const result = await productsCollection.find().toArray() || [];
            res.send(result)
        })
        // add a new product
        app.post('/all-products', async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result)
        })
        // delete a product
        




        // product manage for customer/user
        // get all products
        app.get('/all-products', async (req, res) => {
            const result = await productsCollection.find().toArray() || [];
            res.send(result);
        })
        //    get product by id
        app.get('/all-products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(query);
            res.send(result);
        })










        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

















// test server
app.get('/', (req, res) => {
    res.send('electro-hub server is working')
})
app.listen(port, () => {
    console.log(`electro hub server is running on port ${port}`)
})