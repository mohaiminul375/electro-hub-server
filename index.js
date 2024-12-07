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
        // post user create new user email & pass
        app.post('/users', async (req, res) => {
            try {
                const user_info = req.body;
                const query = { email: user_info.email };

                // Check if the user already exists
                try {
                    const existed = await userCollection.findOne(query);
                    if (existed) {
                        return res.status(409).json({ message: 'User already exists' });
                    }
                } catch (err) {
                    console.error('Error checking existing user:', err.message);
                    return res.status(500).json({ message: 'Error checking existing user' });
                }

                // Hash the password
                let hashedPass;
                try {
                    hashedPass = bcrypt.hashSync(user_info.password, 10);
                } catch (err) {
                    console.error('Error hashing password:', err.message);
                    return res.status(500).json({ message: 'Error processing password' });
                }

                // Insert the new user
                try {
                    const uuid = uuidv4().replace(/-/g, '').substring(0, 10);
                    const result = await userCollection.insertOne({
                        ...user_info,
                        uuid: uuid,
                        password: hashedPass,
                        role: 'user',
                    });
                    return res.status(201).send(result);
                } catch (err) {
                    console.error('Error inserting user into the database:', err.message);
                    return res.status(500).json({ message: 'Error inserting user into the database' });
                }
            } catch (error) {
                console.error('Unexpected error:', error.message);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });



        //   create social account  
        app.post('/social-account', async (req, res) => {
            try {
                const user = req.body;
                const query = { email: user.email };

                try {
                    // Check if the user already exists
                    const isExisted = await userCollection.findOne(query);
                    if (isExisted) {
                        return res.status(200).json({ message: 'User already exists' });
                    }
                } catch (err) {
                    console.error('Error checking existing user:', err.message);
                    return res.status(500).json({ message: 'Error checking user existence' });
                }

                try {
                    // Insert new user
                    const result = await userCollection.insertOne({ ...user, role: 'user' });
                    res.status(201).json({ message: 'User created successfully', result });
                } catch (err) {
                    console.error('Error inserting user into the database:', err.message);
                    return res.status(500).json({ message: 'Error inserting user into the database' });
                }
            } catch (error) {
                console.error('Unexpected error:', error.message);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });

        // login
        // login with email password
        app.post('/login', async (req, res) => {
            try {
                const user = req.body;

                // Validate request body
                if (!user.email || !user.password) {
                    return res.status(400).json({ message: "Email and password are required" });
                }

                try {
                    // Check if the user exists
                    const query = { email: user.email };
                    const existedUser = await userCollection.findOne(query);

                    if (!existedUser) {
                        return res.status(404).json({ message: "User not found" });
                    }

                    try {
                        // Check if the password matches
                        const passwordMatched = await bcrypt.compare(user.password, existedUser.password);
                        if (!passwordMatched) {
                            return res.status(401).json({ message: "Invalid password" });
                        }

                        // Successful login
                        return res.status(200).json({
                            message: "Login successful",
                            user: existedUser,
                        });
                    } catch (err) {
                        console.error("Error verifying password:", err.message);
                        return res.status(500).json({ message: "Error verifying password" });
                    }
                } catch (err) {
                    console.error("Error querying user:", err.message);
                    return res.status(500).json({ message: "Error checking user existence" });
                }
            } catch (error) {
                console.error("Unexpected error:", error.message);
                return res.status(500).json({ message: "Internal Server Error" });
            }
        });


        // ISSUE
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
            console.log(user_info)
            const uuid = user_info.uuid;
            const query = { uuid: uuid };
            const option = { upsert: true };

            if (!uuid) {
                return res.status(400).json({ message: 'Unauthorized access' });
            }
            const isExisted = await userCollection.findOne(query);
            if (!isExisted) {
                return res.status(400).json({ message: 'access denied please contact to support' });
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
            const uuid = address_info.uuid;
            // Validation for required fields
            const { division, district, full_address } = address_info;
            const query = { uuid: uuid };
            const option = { upsert: true };
            if (!uuid) {
                return res.status(400).json({ message: 'Unauthorized access' });
            }
            const isExisted = await userCollection.findOne(query);
            if (!isExisted) {
                return res.status(400).json({ message: 'access denied please contact to support' });
            }
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
                const result = await userCollection.updateOne(query, address, option);
                res.status(200).json({ message: 'Address updated or created successfully', result });
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
        app.post('/all-products', async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result)
        })

        // update a product

        app.put('/all-products/:id', async (req, res) => {
            const update_info = req.body;
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const option = { upsert: true };
            try {
                const updateDoc = {
                    $set: {
                        ...update_info
                    }
                }
                const result = await productsCollection.updateOne(query, updateDoc, option);
                res.send(result)
            } catch (error) {
                res.status(500).send({ error: 'An error occurred while fetching products.', error });
            }
        })

        // delete a product
        app.delete('/all-products-admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        })

        // cart management 
        // all carts products
        app.get('/all-carts', async (req, res) => {
            const result = await cartCollection.find().toArray() || [];
            res.send(result);
        })
        // get cart by user uuid
        app.get('/all-carts/:uuid', async (req, res) => {
            const uuid = req.params.uuid;
            const query = { uuid: uuid };
            const result = await cartCollection.find(query).toArray();

            // Add total quantity and total price to each cart
            const resultWithTotal = result.map(cart => {
                let totalQuantity = 0;
                let totalPrice = 0;

                // Calculate total quantity and total price for each cart
                cart.items.forEach(item => {
                    totalQuantity += item.quantity;
                    totalPrice += item.price * item.quantity;
                });

                // Return the cart with total quantity and total price
                return {
                    ...cart,
                    totalQuantity,
                    totalPrice
                };
            });

            res.send(resultWithTotal);
        });

        // add to cart
        app.post('/cart', async (req, res) => {
            const cartItem = req.body;
            const { product_id, uuid, product_name, category, color, brand, price, img } = cartItem;

            // Query to find the user's cart using uuid
            const queryUser = { uuid: uuid };

            try {
                // Check if user exists in the cart collection
                const findUser = await cartCollection.findOne(queryUser);

                // If the user doesn't have a cart, create a new cart
                if (!findUser) {
                    const newCart = {
                        uuid: uuid,
                        items: [
                            {
                                product_id: product_id,
                                product_name: product_name,
                                category: category,
                                color: color,
                                brand: brand,
                                price: price,
                                img: img,
                                quantity: 1, // Initial quantity is 1
                            },
                        ],
                    };
                    await cartCollection.insertOne(newCart);
                    return res.status(201).json({ message: 'Product added to cart' });
                }

                // If user has a cart, check if the product is already in the cart
                const existingProduct = findUser.items.find(item => item.product_id === product_id);

                if (existingProduct) {
                    // If the product is found, increase its quantity by 1
                    existingProduct.quantity += 1;
                    await cartCollection.updateOne(
                        { uuid: uuid, "items.product_id": product_id },
                        { $set: { "items.$.quantity": existingProduct.quantity } }
                    );
                    return res.status(200).json({ message: 'Product quantity updated' });
                } else {
                    // If the product is not in the cart, add it as a new item
                    await cartCollection.updateOne(
                        { uuid: uuid },
                        {
                            $push: {
                                items: {
                                    product_id: product_id,
                                    product_name: product_name,
                                    category: category,
                                    color: color,
                                    brand: brand,
                                    price: price,
                                    img: img,
                                    quantity: 1
                                }
                            }
                        }
                    );
                    return res.status(201).json({ message: 'Product added to cart' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'An error occurred while updating the cart' });
            }
        });


        // update cat quantity
        app.patch('/update-quantity', async (req, res) => {
            const { uuid, action, productId } = req.body;

            if (!uuid || !action || !productId) {
                return res.status(400).send({ message: 'Invalid input' });
            }

            try {
                const increment = action === 'plus' ? 1 : -1;

                const result = await cartCollection.updateOne(
                    { uuid, 'items.product_id': productId },
                    { $inc: { 'items.$.quantity': increment } }
                );

                if (result.modifiedCount === 0) {
                    return res.status(404).send({ message: 'Cart or product not found' });
                }

                res.send({ message: 'Quantity updated successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error' });
            }
        });


        // product manage for customer/user
        // get all product with filter
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

        //    get product by id
        app.get('/all-products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        //    get product by category with filter
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