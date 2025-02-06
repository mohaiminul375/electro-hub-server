const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { default: axios } = require("axios");
// middleware
app.use(express.json());
app.use(express.urlencoded());
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://electro-hub-tau.vercel.app"

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
        const paymentsCollection = client.db('electro-hub').collection('payments');
        const ordersCollection = client.db('electro-hub').collection('all-order');

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
        // get user info
        app.get('/all-users/:uuid', async (req, res) => {
            try {
                const uuid = req.params.uuid;
                const user = await userCollection.findOne({ uuid: uuid });

                if (user) {
                    const { password, ...userWithoutPassword } = user; // Exclude the password
                    res.send(userWithoutPassword);
                } else {
                    res.status(404).send({ message: 'User not found' });
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                res.status(500).send({ message: 'Failed to fetch user', error });
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
                const id = user.id;
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
                    const result = await userCollection.insertOne({ ...user, role: 'user', uuid: id });
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
        // get products in home page
        app.get('/home-products', async (req, res) => {
            const query = { status: 'in_stock' }
            // TODO: sort by review
            const result = await productsCollection.find(query).limit(8).toArray() || [];
            res.send(result)
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

        // Create order Id
        async function getCustomOrderId() {
            const currentDate = new Date();
            const datePrefix = currentDate.toISOString().slice(2, 10).replace(/-/g, ""); // Format YYMMDD

            // Check if the document for the current date exists
            let result = await ordersCollection.findOne({ date: datePrefix });

            // If the document doesn't exist, create it and initialize the counter
            if (!result) {
                const newDoc = {
                    date: datePrefix,
                    counter: 1,
                    // You can add additional fields like 'orderId', 'status', etc. if needed
                };
                await ordersCollection.insertOne(newDoc);
                result = { counter: 1 }; // Initialize counter to 1 after insertion
            } else {
                // Increment the counter if the document exists
                result = await ordersCollection.findOneAndUpdate(
                    { date: datePrefix },
                    { $inc: { counter: 1 } },
                    { returnDocument: 'after' } // Return the updated document
                );
            }

            // Get the updated counter value
            const counter = result.counter;

            // Ensure the serial number length starts at 5 digits, but grows dynamically
            const serialLength = Math.max(5, counter.toString().length);
            const serial = counter.toString().padStart(serialLength, '0'); // Format the serial number

            // Return the custom order ID
            return `${datePrefix}${serial}`;
        }






        // SSL Commerz Payment
        app.post('/create-payment', async (req, res) => {
            try {
                const paymentInfo = req.body;
                console.log(paymentInfo);

                // Extract Information from client
                const { name, email, phone, division, district, full_address, total_price, items, uuid } = paymentInfo;
                const trxId = new ObjectId().toString();

                // PAYMENT DATA
                const initiatePaymentData = {
                    store_id: `${process.env.STORE_ID}`,
                    store_passwd: `${process.env.STORE_PASS}`,
                    total_amount: total_price,
                    currency: "BDT",
                    tran_id: trxId,
                    success_url: "https://electro-hub-server.vercel.app/success-payment",
                    fail_url: "https://electro-hub-server.vercel.app/failed",
                    cancel_url: "https://electro-hub-server.vercel.app/cancel",
                    cus_name: name,
                    cus_email: email,
                    cus_add1: full_address,
                    cus_city: district,
                    cus_state: division,
                    cus_postcode: "None",
                    cus_country: "Bangladesh",
                    cus_phone: phone,
                    shipping_method: "No",
                    product_name: "example",
                    product_category: 'Gadget',
                    product_profile: "General",
                    ship_name: name,
                    ship_add1: full_address,
                    ship_city: district,
                    ship_state: division,
                    ship_postcode: "None",
                    ship_country: "Bangladesh",
                    multi_card_name: "mastercard,visacard,amexcard&",
                    value_a: "ref001_A&",
                    value_b: "ref002_B&",
                    value_c: "ref003_C&",
                    value_d: "ref004_D"
                };

                const response = await axios.post(
                    'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
                    initiatePaymentData,
                    {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        }
                    }
                );

                // Save Info to DB
                const saveData = {
                    customer_name: name,
                    customer_email: email,
                    customer_Phone: phone,
                    transaction_id: trxId,
                    status: 'pending',
                };

                // Create
                const new_order = {
                    customer_uuid: uuid,
                    customer_name: name,
                    customer_email: email,
                    customer_Phone: phone,
                    transaction_id: trxId,
                    total_price: total_price,
                    address: {
                        division: division,
                        district: district,
                        full_address: full_address,
                    },
                    products: items
                };

                const createPayment = await paymentsCollection.insertOne(saveData);
                const createOrder = await ordersCollection.insertOne(new_order);
                console.log('inside create payment')
                if (createPayment && createOrder) {
                    res.send({
                        paymentUrl: response?.data?.GatewayPageURL
                    });
                } else {
                    throw new Error("Failed to save payment or order data.");
                }
            } catch (error) {
                console.log("Error processing payment:", error);
                res.status(500).send({
                    message: "An error occurred while processing the payment.",
                    error: error.message
                });
            }
        });

        // success payment
        app.post('/success-payment', async (req, res) => {
            console.log('successfull payment')
            const { status, tran_id, tran_date, card_issuer } = req.body;
            const newOrderId = await getCustomOrderId();
            console.log(req.body, 'Success data');
            try {

                // Validate payment status and transaction ID
                if (status !== 'VALID' || !tran_id) {
                    return res.status(400).json({ message: 'Invalid or Unauthorized Payment' });
                }

                // Update the payment status in the database
                const paymentQuery = { transaction_id: tran_id };
                const orderQuery = { transaction_id: tran_id };
                console.log(paymentQuery, orderQuery, 'Query')
                const paymentUpdate = {
                    $set: {
                        status: 'success',
                        created_at: tran_date,
                        payment_method: card_issuer
                    }
                };
                const paymentResult = await paymentsCollection.updateOne(paymentQuery, paymentUpdate);
                // Delete cart for a specific order
                const order = await ordersCollection.findOne(orderQuery);

                if (order) {
                    const { customer_uuid } = order;
                    if (customer_uuid) {
                        const deleteResult = await cartCollection.deleteOne({ uuid: customer_uuid });

                        if (deleteResult.deletedCount > 0) {
                            console.log(`Successfully deleted cart for customer_uuid: ${customer_uuid}`);
                        } else {
                            console.log(`No cart found for customer_uuid: ${customer_uuid}`);
                        }
                    } else {
                        console.log('No customer_uuid associated with the order.');
                    }
                } else {
                    console.log('Order not found with the given query.');
                }

                // If payment update fails, return an error
                if (paymentResult.modifiedCount === 0) {
                    return res.status(404).json({ message: 'Payment transaction not found or already updated' });
                }

                // Update or create the order with the new order ID
                const orderUpdate = {
                    $set: {
                        order_id: newOrderId,
                        order_status: 'pending',
                        payment_method: card_issuer,
                        orderCreatedAt: tran_date,
                    }
                };
                const orderResult = await ordersCollection.updateOne(orderQuery, orderUpdate);

                // If the order was updated successfully, redirect to success page
                if (orderResult.modifiedCount > 0) {
                    return res.redirect('http://localhost:3000/checkout/success');
                } else {
                    return res.status(404).json({ message: 'Order not found' });
                }
            } catch (error) {
                console.log('Error processing payment:', error);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });


        // failed payment
        app.post('/failed', async (req, res) => {
            try {
                const { status, tran_id } = req.body;

                // Validate status and transaction ID
                if (status !== 'FAILED' || !tran_id) {
                    return res.status(400).json({ message: 'Invalid request or status' });
                }

                // Delete the payment record
                const query = { transaction_id: tran_id };
                const updateDoc = { $set: { status: 'failed' } };
                const result = await paymentsCollection.updateOne(query, updateDoc);

                if (result.modifiedCount > 0) {
                    return res.redirect('http://localhost:3000/checkout/failed');
                } else {
                    return res.status(404).json({ message: 'Transaction not found' });
                }

            } catch (error) {
                console.error('Error handling failed payment:', error);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });

        // cancel payment
        app.post('/cancel', async (req, res) => {
            try {
                const { status, tran_id } = req.body;

                if (status === 'CANCELLED' && tran_id) {
                    const query = { transaction_id: tran_id };
                    const result = await paymentsCollection.deleteOne(query);

                    if (result.deletedCount > 0) {
                        return res.redirect('http://localhost:3000/checkout/cancel');
                    } else {
                        return res.status(404).json({ message: 'Transaction not found' });
                    }
                }

                res.status(400).json({ message: 'Invalid cancel data' });
            } catch (error) {
                console.error('Error cancelling transaction:', error);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });
        // Get Payment info
        app.get('/all-payments', async (req, res) => {
            try {
                const query = { status: { $ne: 'pending' } };
                const result = await paymentsCollection.find(query).toArray();
                res.send(result || []);
            } catch (error) {
                console.error('Error fetching payments:', error);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });
        // All Orders for Admin
        app.get('/all-orders-admin', async (req, res) => {
            try {
                const result = await ordersCollection.find({ counter: { $exists: false } }).toArray();
                res.status(200).send(result);
            } catch (error) {
                console.error("Error fetching orders:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Get single / order details by id Admin
        app.get('/all-orders-admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await ordersCollection.findOne(query);
            res.send(result)
        })
        // Order Management
        // Order summary
        app.get('/orders-summary', async (req, res) => {
            try {
                const pendingFilter = { order_status: 'pending' };
                const approvedFilter = { order_status: 'approved' }
                const packedFilter = { order_status: 'packed' }
                const shippedFilter = { order_status: 'shipped' }
                // Return data
                const pendingOrdersCount = await ordersCollection.countDocuments(pendingFilter);
                const approvedOrdersCount = await ordersCollection.countDocuments(approvedFilter);
                const packedOrdersCount = await ordersCollection.countDocuments(packedFilter);
                const shippedOrdersCount = await ordersCollection.countDocuments(shippedFilter);

                res.json({ pendingOrdersCount, approvedOrdersCount, packedOrdersCount, shippedOrdersCount });
            } catch (error) {
                res.status(500).json({ message: 'Internal Server Error', error: error.message });
            }
        });
        // Pending Orders   
        app.get('/pending-orders', async (req, res) => {
            const query = { order_status: 'pending' }
            const result = await ordersCollection.find(query).toArray() || [];
            res.send(result)
        })
        // Pending order details
        app.get('/pending-orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await ordersCollection.findOne(query);
            res.send(result)
        })
        // Make order approved by admin
        app.put('/approved-order/:orderId', async (req, res) => {
            const orderId = req.params.orderId;
            const newData = req.body;
            const query = { order_id: orderId }
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    order_status: 'approved',
                    ...newData
                }
            }
            const result = await ordersCollection.updateOne(query, updateDoc, option);
            res.send(result)
        })
        // Approve orders get by admin
        app.get('/approved-orders', async (req, res) => {
            const query = { order_status: 'approved' }
            const result = await ordersCollection.find(query).toArray() || [];
            res.send(result);
        })

        // get Approved order by uuid user
        // TODO: Review it
        app.get('/approved-orders/:uuid', async (req, res) => {
            const uuid = req.params.uuid;
            const query = { order_status: 'approved', customer_uuid: uuid }
            const result = await ordersCollection.find(query).toArray();
            res.send(result)
        })
        // Make order Packed by admin
        app.put('/packed-orders/:orderId', async (req, res) => {
            const orderId = req.params.orderId;
            const newData = req.body;
            const query = { order_id: orderId }
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    order_status: 'packed',
                    ...newData
                }
            }
            const result = await ordersCollection.updateOne(query, updateDoc, option);
            res.send(result)
        })
        // Get All packed Order for Admin
        app.get('/packed-orders', async (req, res) => {
            const query = { order_status: 'packed' }
            const result = await ordersCollection.find(query).toArray() || [];
            res.send(result)
        })
        app.get('/packed-orders/:id', async (req, res) => {
            // const query = { order_status: 'packed' }
            const orderId = req.params.id;
            const query = { _id: new ObjectId(orderId) }
            const result = await ordersCollection.findOne(query)
            res.send(result)
        })
        app.put('/shipped-orders/:orderId', async (req, res) => {
            const orderId = req.params.orderId;
            const newData = req.body;
            const query = { order_id: orderId }
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    order_status: 'shipped',
                    ...newData
                }
            }
            const result = await ordersCollection.updateOne(query, updateDoc, option);
            res.send(result)
        })
        app.get('/shipped-orders', async (req, res) => {
            const query = { order_status: 'shipped' }
            const result = await ordersCollection.find(query).toArray() || [];
            res.send(result)
        })
        // Make order shipped
        app.put('/delivered/:orderId', async (req, res) => {
            const orderId = req.params.orderId;
            const query = { order_id: orderId }
            const newData = req.body;
            console.log(orderId, newData)
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    order_status: 'delivered',
                    ...newData
                }
            }
            const result = await ordersCollection.updateOne(query, updateDoc, option)
            console.log(result)
            res.send(result)
        })

        app.get('/delivered', async (req, res) => {
            const query = { order_status: 'delivered' }
            const result = await ordersCollection.find(query).toArray() || [];
            res.send(result)
        })


        // Order management for Users
        //Get All order for user by uuid
        app.get('/all-orders-users/:uuid', async (req, res) => {
            const uuid = req.params.uuid;
            const query = { customer_uuid: uuid }
            const result = await ordersCollection.find(query).toArray();
            res.send(result)
        });
        // To Ship for users
        // To Ship for users
        app.get('/to-ship/:uuid', async (req, res) => {
            const uuid = req.params.uuid;

            try {
                const query = {
                    order_status: { $in: ['approved', 'packed'] },
                    customer_uuid: uuid
                };

                const orders = await ordersCollection.find(query).toArray();

                res.status(200).send(orders);
            } catch (error) {
                console.error('Error fetching orders:', error.message);
                res.status(500).send({ message: 'Failed to fetch orders', error: error.message });
            }
        });

        // To Received for 
        app.get('/to-received/:uuid', async (req, res) => {
            const uuid = req.params.uuid;

            try {
                const query = {
                    order_status: { $in: ['shipped'] },
                    customer_uuid: uuid
                };

                const orders = await ordersCollection.find(query).toArray();

                res.status(200).send(orders);
            } catch (error) {
                console.error('Error fetching orders:', error.message);
                res.status(500).send({ message: 'Failed to fetch orders', error: error.message });
            }
        });
        app.get('/delivered/:uuid', async (req, res) => {
            const uuid = req.params.uuid;

            try {
                const query = {
                    order_status: { $in: ['delivered'] },
                    customer_uuid: uuid
                };

                const orders = await ordersCollection.find(query).toArray();

                res.status(200).send(orders);
            } catch (error) {
                console.error('Error fetching orders:', error.message);
                res.status(500).send({ message: 'Failed to fetch orders', error: error.message });
            }
        });
        app.get('/canceled/:uuid', async (req, res) => {
            const uuid = req.params.uuid;

            try {
                const query = {
                    order_status: { $in: ['canceled'] },
                    customer_uuid: uuid
                };

                const orders = await ordersCollection.find(query).toArray();

                res.status(200).send(orders);
            } catch (error) {
                console.error('Error fetching orders:', error.message);
                res.status(500).send({ message: 'Failed to fetch orders', error: error.message });
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