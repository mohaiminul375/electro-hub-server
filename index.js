const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
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
        const cartCollection = client.db('electro-hub').collection('cart');

        // TODO: try catch

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



        // create user
        // post user create new user
        app.post('/users', async (req, res) => {
            const user_info = req.body;
            const query = { email: user_info.email };
            // Check if user already exists
            const existed = await userCollection.findOne(query);
            if (existed) {
                return res.status(409).json({ message: 'User already exists' });
            }
            // hashed password
            const hashedPass = bcrypt.hashSync(user_info.password, 10);
            // Insert new user
            const result = await userCollection.insertOne({ ...user_info, password: hashedPass, role: 'user' });
            return res.status(201).send(result);
        });


        //   create social account  
        app.post('/social-account', async (req, res) => {
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
        // login
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


        // social login
        app.post('/social-login', async (req, res) => {
            try {
                const user = req.body;
                console.log(user);

                const query = { email: user.email };
                const isExisted = await userCollection.findOne(query);

                if (!isExisted) {
                    return res.status(200).json({ message: 'User does not exist' });
                }

                return res.status(200).json({ message: "Login successful", socialUser: isExisted });
            } catch (error) {
                console.error("Error during social login:", error);
                return res.status(500).json({ message: "An error occurred during login", error: error.message });
            }
        });

        // update user
        // update profile
        app.put('/update-profile', async (req, res) => {
            const user_info = req.body;
            const email = user_info.email;
            const query = { email: email };
            const option = { upsert: true };

            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }
            // updated info
            const info = {
                $set: {
                    ...user_info
                }
            };

            try {
                // Update user info in the database
                const result = await userCollection.updateOne(query, info, option);

                // Return the result of the update operation
                res.status(200).json({ message: 'User profile updated successfully', result });
            } catch (error) {
                // Handle errors
                console.error(error);
                res.status(500).json({ message: 'Server error occurred while updating the profile' });
            }
        });
        // update address
        app.put('/update-address', async (req, res) => {
            const address_info = req.body;
            const email = address_info.email;
            // Validation for required fields
            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }
            const { division, district, full_address } = address_info;
            const query = { email: email };
            const option = { upsert: true };
            // updated info
            const address = {
                $set: {
                    address: {
                        division: division,
                        district: district,
                        full_address: full_address,
                    },
                },
            };

            try {
                await userCollection.updateOne(query, address, option);
                res.status(200).json({ message: 'Address updated or created successfully' });
            } catch (error) {
                console.error('Error updating address:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        // update role








        // admin-dashboard
        // manage products
        // get products for admin
        app.get('/all-products-admin', async (req, res) => {
            // const brand = req.query.brand;
            // const price = req.query.price;
            // const color = req.query.color;
            // const query = {
            //     $or: [
            //         { brand:}
            //     ]
            // }
            const result = await productsCollection.find().toArray() || [];
            res.send(result)
        })
        // add a new product
        app.get('/all-products', async (req, res) => {
            try {
                const { brand, color, sort } = req.query;
                const query = {};
                // append brand color
                if (brand && brand !== '') {
                    query.brand = brand;
                }
                if (color && color !== '') {
                    query.color = color;
                }

                // Sorting logic: default to ascending if sort is invalid
                let sortOptions = {};
                if (sort === 'high-to-low') {
                    sortOptions = { product_price: -1 }; // Descending
                } else if (sort === 'low-to-high') {
                    sortOptions = { product_price: 1 }; // Ascending
                }

                // Fetch products based on the query and sort options
                const result = await productsCollection
                    .find(query)
                    .sort(sortOptions)
                    .toArray();

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'An error occurred while fetching products.' });
            }
        });
        // update a product



        // delete a product
        app.delete('/all-products-admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        })




        // product manage for customer/user
        // get all products //TOD: check is needed
        // app.get('/all-products', async (req, res) => {
        //     const result = await productsCollection.find().toArray() || [];
        //     res.send(result);
        // })
        //    get product by id
        app.get('/all-products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(query);
            res.send(result);
        })
        //    get product by category
        app.get('/products/:category', async (req, res) => {
            const category = req.params.category;
            const { brand, color, sort } = req.query;
            try {
                // Initialize the query object with the category
                const query = { category: category };

                // Add brand filter if provided
                if (brand) {
                    query.brand = brand;
                }

                // Add color filter if provided
                if (color) {
                    query.color = color;
                }

                // Set up sorting based on the sort query parameter
                let sortOptions = {};
                if (sort === 'high-to-low') {
                    sortOptions.product_price = -1; // Sort by price descending
                } else if (sort === 'low-to-high') {
                    sortOptions.product_price = 1; // Sort by price ascending
                }

                const result = await productsCollection.find(query).sort(sortOptions).toArray();
                res.status(200).send(result || []);
            } catch (error) {
                console.error('Error fetching products by category:', error.message);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });







        app.get('/test', async (req, res) => {
            const new_id_1 = uuidv4();
            const new_id = new_id_1.replace(/-/g, '').substring(0, 10);
            res.send({ new_id, new_id_1 })
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