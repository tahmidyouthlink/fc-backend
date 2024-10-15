const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT | 5000;
require("dotenv").config();
const cors = require("cors");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n9or6wr.mongodb.net/?appName=Cluster0`;

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
    const productInformationCollection = client.db("fashion-commerce").collection("all-product-information");
    const orderListCollection = client.db("fashion-commerce").collection("orderList");
    const customerListCollection = client.db("fashion-commerce").collection("customerList");
    const seasonCollection = client.db("fashion-commerce").collection("seasons");
    const categoryCollection = client.db("fashion-commerce").collection("category");
    const colorCollection = client.db("fashion-commerce").collection("colors");
    const vendorCollection = client.db("fashion-commerce").collection("vendors");
    const tagCollection = client.db("fashion-commerce").collection("tags");
    const promoCollection = client.db("fashion-commerce").collection("promo-code");
    const offerCollection = client.db("fashion-commerce").collection("offers");
    const shippingZoneCollection = client.db("fashion-commerce").collection("shipping-zone");
    const shipmentHandlerCollection = client.db("fashion-commerce").collection("shipment-handler");
    const paymentMethodCollection = client.db("fashion-commerce").collection("payment-methods");

    // post a product
    app.post("/addProduct", async (req, res) => {
      try {
        const productData = req.body;
        const result = await productInformationCollection.insertOne(productData);
        res.send(result);
      } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send({ message: "Failed to add product", error: error.message });
      }
    });

    // get all products
    app.get("/allProducts", async (req, res) => {
      try {
        const result = await productInformationCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send({ message: "Failed to fetch products", error: error.message });
      }
    });

    // get single product info
    app.get("/singleProduct/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productInformationCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Product Details:", error);
        res.status(500).send({ message: "Failed to fetch Product Details", error: error.message });
      }
    });

    // get single product info
    app.get("/productFromCategory/:categoryName", async (req, res) => {
      try {
        const categoryName = req.params.categoryName;
        const query = { category: categoryName };
        const result = await productInformationCollection.find(query).toArray();

        if (!result) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Product Details:", error);
        res.status(500).send({ message: "Failed to fetch Product Details", error: error.message });
      }
    });

    //update a single product details
    app.put("/editProductDetails/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const productDetails = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateProductDetails = {
          $set: { ...productDetails }
        };

        const result = await productInformationCollection.updateOne(filter, updateProductDetails);
        res.send(result);
      } catch (error) {
        console.error("Error updating product details:", error);
        res.status(500).send({ message: "Failed to update product details", error: error.message });
      }
    });

    // post vendors
    app.post("/addVendor", async (req, res) => {
      try {
        const vendors = req.body; // Should be an array
        const result = await vendorCollection.insertOne(vendors);
        res.send(result); // Send 201 status on success
      } catch (error) {
        console.error('Error adding vendors:', error);
        res.status(500).send({ error: 'Failed to add vendors' }); // Send 500 status on error
      }
    });

    // delete single vendor
    app.delete("/deleteVendor/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await vendorCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Vendor not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting vendor:", error);
        res.status(500).send({ message: "Failed to delete vendor", error: error.message });
      }
    });

    // get all vendors
    app.get("/allVendors", async (req, res) => {
      try {
        const result = await vendorCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        res.status(500).send({ message: "Failed to fetch vendors", error: error.message });
      }
    });

    // get single vendor info
    app.get("/getSingleVendorDetails/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await vendorCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Vendor not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Vendor:", error);
        res.status(500).send({ message: "Failed to fetch Vendor", error: error.message });
      }
    });

    //update a single vendor info
    app.put("/editVendor/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const vendorData = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedVendorDetails = {
          $set: { ...vendorData }
        };

        const result = await vendorCollection.updateOne(filter, updatedVendorDetails);

        res.send(result);
      } catch (error) {
        console.error("Error updating this vendor:", error);
        res.status(500).send({ message: "Failed to update this vendor", error: error.message });
      }
    });

    // post tags
    app.post("/addTag", async (req, res) => {
      try {
        const tags = req.body; // Should be an array
        if (!Array.isArray(tags)) {
          return res.status(400).send({ error: 'Expected an array of tags' });
        }
        const result = await tagCollection.insertMany(tags);
        res.status(201).send(result); // Send 201 status on success
      } catch (error) {
        console.error('Error adding tags:', error);
        res.status(500).send({ error: 'Failed to add tags' }); // Send 500 status on error
      }
    });

    // delete single tag
    app.delete("/deleteTag/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await tagCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Tag not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting tag:", error);
        res.status(500).send({ message: "Failed to delete tag", error: error.message });
      }
    });

    // get all tags
    app.get("/allTags", async (req, res) => {
      try {
        const result = await tagCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching tags:", error);
        res.status(500).send({ message: "Failed to fetch tags", error: error.message });
      }
    });

    // post colors
    app.post("/addColor", async (req, res) => {
      try {
        const colors = req.body; // Should be an array
        if (!Array.isArray(colors)) {
          return res.status(400).send({ error: 'Expected an array of colors' });
        }
        const result = await colorCollection.insertMany(colors);
        res.status(201).send(result); // Send 201 status on success
      } catch (error) {
        console.error('Error adding colors:', error);
        res.status(500).send({ error: 'Failed to add colors' }); // Send 500 status on error
      }
    });

    // delete single color
    app.delete("/deleteColor/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await colorCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Color not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting color:", error);
        res.status(500).send({ message: "Failed to delete color", error: error.message });
      }
    });

    // get all colors
    app.get("/allColors", async (req, res) => {
      try {
        const result = await colorCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching colors:", error);
        res.status(500).send({ message: "Failed to fetch colors", error: error.message });
      }
    });

    // Add a season
    app.post('/addSeason', async (req, res) => {
      const seasonData = req.body;
      try {
        const result = await seasonCollection.insertOne(seasonData);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding season:", error);
        res.status(500).send({ message: "Failed to add season", error: error.message });
      }
    });

    // Get All Seasons
    app.get('/allSeasons', async (req, res) => {
      try {
        const seasons = await seasonCollection.find().toArray();
        res.status(200).send(seasons);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single season info
    app.get("/allSeasons/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await seasonCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Season not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching season:", error);
        res.status(500).send({ message: "Failed to fetch season", error: error.message });
      }
    });

    // delete single season
    app.delete("/deleteSeason/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await seasonCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Season not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting season:", error);
        res.status(500).send({ message: "Failed to delete season", error: error.message });
      }
    });

    //update a single season
    app.put("/editSeason/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const season = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateSeason = {
          $set: { ...season }
        };

        const result = await seasonCollection.updateOne(filter, updateSeason);

        res.send(result);
      } catch (error) {
        console.error("Error updating season:", error);
        res.status(500).send({ message: "Failed to update season", error: error.message });
      }
    });

    // Add a Category
    app.post('/addCategory', async (req, res) => {
      const categoryData = req.body;
      try {
        const result = await categoryCollection.insertOne(categoryData);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).send({ message: "Failed to add category", error: error.message });
      }
    });

    // Get All Categories
    app.get('/allCategories', async (req, res) => {
      try {
        const categories = await categoryCollection.find().toArray();
        res.status(200).send(categories);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single category info
    app.get("/allCategories/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await categoryCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Category not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).send({ message: "Failed to fetch category", error: error.message });
      }
    });

    // delete single category
    app.delete("/deleteCategory/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await categoryCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Category not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).send({ message: "Failed to delete category", error: error.message });
      }
    });

    //update a single category
    app.put("/editCategory/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const category = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateCategory = {
          $set: { ...category }
        };

        const result = await categoryCollection.updateOne(filter, updateCategory);

        res.send(result);
      } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).send({ message: "Failed to update category", error: error.message });
      }
    });

    // Get All Sizes
    app.get('/allSizeRanges', async (req, res) => {
      try {
        const categories = await categoryCollection.find().toArray();
        const sizeOptions = categories.reduce((acc, category) => {
          acc[category.key] = category.sizes || []; // Ensure sizes exist
          return acc;
        }, {});
        res.status(200).send(sizeOptions);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // Get All Sub-Categories
    app.get('/allSubCategories', async (req, res) => {
      try {
        const categories = await categoryCollection.find().toArray();
        const subCategoryOptions = categories.reduce((acc, category) => {
          acc[category.key] = category.subCategories || [];  // Ensure subCategories exist
          return acc;
        }, {});
        res.status(200).send(subCategoryOptions);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // post a order
    app.post("/addOrder", async (req, res) => {
      try {
        const orderData = req.body;
        const result = await orderListCollection.insertOne(orderData);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding order:", error);
        res.status(500).send({ message: "Failed to add order", error: error.message });
      }
    });

    // Get All Orders
    app.get('/allOrders', async (req, res) => {
      try {
        // Sort by a field in descending order (e.g., by '_id' or 'dateTime' if you have a date field)
        const orders = await orderListCollection.find().sort({ _id: -1 }).toArray();
        res.status(200).send(orders);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // applying pagination in orderList
    app.get("/orderList", async (req, res) => {
      try {
        const pageStr = req.query?.page;
        const itemsPerPageStr = req.query?.itemsPerPage;
        const pageNumber = parseInt(pageStr) || 0;
        const itemsPerPage = parseInt(itemsPerPageStr) || 25; // Default to 25 if not provided
        const skip = pageNumber * itemsPerPage;

        // Fetching the total number of orders
        const totalOrderList = await orderListCollection.estimatedDocumentCount();

        // Fetching the reversed data for the specific page
        const result = await orderListCollection.find()
          .sort({ _id: -1 })
          .skip(skip)
          .limit(itemsPerPage)
          .toArray();

        // Sending the result and total count to the frontend
        res.send({ result, totalOrderList });
      } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send({ message: "Failed to fetch orders", error: error.message });
      }
    });

    // Update order status
    app.patch("/changeOrderStatus/:id", async (req, res) => {
      const id = req.params.id;
      const { orderStatus } = req.body; // Extract status from request body

      // Define valid statuses
      const validStatuses = [
        "Pending",
        "Processing",
        "Shipped",
        "On Hold",
        "Delivered",
        "Requested Return",
        "Refunded"
      ];

      // Validate the provided status
      if (!validStatuses.includes(orderStatus)) {
        return res.status(400).send({ error: "Invalid order status" });
      }

      const filter = { _id: new ObjectId(id) };

      try {
        // Find the current order to get its current status
        const order = await orderListCollection.findOne(filter);

        if (!order) {
          return res.status(404).send({ error: "Order not found" });
        }

        // Prepare the update document
        const updateDoc = {
          $set: {
            orderStatus: orderStatus,
            previousStatus: order.orderStatus, // Store the current status as the previous status
            lastStatusChange: new Date(),      // Record the timestamp of the status change
          },
        };

        const result = await orderListCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount > 0) {
          res.send(result);
        } else {
          res.status(404).send({ error: "Order not found" });
        }
      } catch (err) {
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // for barcode
    // app.get("/getOrderDetails", async (req, res) => {
    //   const orderNumber = req.query.orderNumber;

    //   if (!orderNumber) {
    //     return res.status(400).send({ error: "Order number is required" });
    //   }

    //   try {
    //     const order = await orderListCollection.findOne({ orderNumber });

    //     if (order) {
    //       res.send(order);
    //     } else {
    //       res.status(404).send({ error: "Order not found" });
    //     }
    //   } catch (error) {
    //     res.status(500).send({ error: "Internal server error" });
    //   }
    // });

    // post a customer details while login
    app.post("/addCustomerDetails", async (req, res) => {
      try {
        const customerData = req.body;
        const result = await customerListCollection.insertOne(customerData);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding customer details:", error);
        res.status(500).send({ message: "Failed to add customer details", error: error.message });
      }
    });

    // Get All Customer Information
    app.get('/allCustomerDetails', async (req, res) => {
      try {
        const customers = await customerListCollection.find().toArray();
        res.status(200).send(customers);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // applying pagination in customer list
    app.get("/customerList", async (req, res) => {
      try {
        const pageStr = req.query?.page;
        const itemsPerPageStr = req.query?.itemsPerPage;
        const pageNumber = parseInt(pageStr) || 0;
        const itemsPerPage = parseInt(itemsPerPageStr) || 25; // Default to 25 if not provided
        const skip = pageNumber * itemsPerPage;

        // Fetching the total number of orders
        const totalCustomerList = await customerListCollection.estimatedDocumentCount();

        // Fetching the reversed data for the specific page
        const result = await customerListCollection.find()
          .skip(skip)
          .limit(itemsPerPage)
          .toArray();

        // Sending the result and total count to the frontend
        res.send({ result, totalCustomerList });
      } catch (error) {
        console.error("Error fetching customer list:", error);
        res.status(500).send({ message: "Failed to fetch customer list", error: error.message });
      }
    });

    // GET endpoint to retrieve customer rating
    app.get('/getCustomerRating/:customerId', async (req, res) => {
      const { customerId } = req.params;

      try {
        const customer = await customerListCollection.findOne({ customerId: customerId });

        if (!customer) {
          return res.status(404).json({ message: 'Customer not found' });
        }

        // Send the customer with the rating
        res.status(200).json({ rating: customer.rating });
      } catch (error) {
        console.error('Error retrieving rating:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // PATCH endpoint to update customer rating
    app.patch('/addRatingToCustomer/:customerId', async (req, res) => {
      const { customerId } = req.params;
      const { rating } = req.body;

      try {
        const result = await customerListCollection.updateOne(
          { customerId: customerId },
          { $set: { rating: rating } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Customer not found' });
        }

        res.status(200).json({ rating: rating });
      } catch (error) {
        console.error('Error updating rating:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // post a promo code
    app.post("/addPromoCode", async (req, res) => {
      try {
        const discountData = req.body;
        const result = await promoCollection.insertOne(discountData);
        res.send(result);
      } catch (error) {
        console.error("Error adding promo code:", error);
        res.status(500).send({ message: "Failed to add promo code", error: error.message });
      }
    });

    // Get All Promo Codes
    app.get('/allPromoCodes', async (req, res) => {
      try {
        const promos = await promoCollection.find().sort({ _id: -1 }).toArray();
        res.status(200).send(promos);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single promo info
    app.get("/getSinglePromo/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await promoCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Promo not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching promo:", error);
        res.status(500).send({ message: "Failed to fetch promo", error: error.message });
      }
    });

    // delete single promo
    app.delete("/deletePromo/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await promoCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Promo not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting promo:", error);
        res.status(500).send({ message: "Failed to delete promo", error: error.message });
      }
    });

    //update a single promo
    app.put("/updatePromo/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const promo = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatePromo = {
          $set: { ...promo }
        };

        const result = await promoCollection.updateOne(filter, updatePromo);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Promo not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating promo:", error);
        res.status(500).send({ message: "Failed to update promo", error: error.message });
      }
    });

    // post a offer
    app.post("/addOffer", async (req, res) => {
      try {
        const offerData = req.body;
        const result = await offerCollection.insertOne(offerData);
        res.send(result);
      } catch (error) {
        console.error("Error adding offer:", error);
        res.status(500).send({ message: "Failed to add offer", error: error.message });
      }
    });

    // Get All Offer
    app.get('/allOffers', async (req, res) => {
      try {
        const offers = await offerCollection.find().sort({ _id: -1 }).toArray();
        res.status(200).send(offers);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    // get single offer
    app.get("/getSingleOffer/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await offerCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Offer not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching promo:", error);
        res.status(500).send({ message: "Failed to fetch promo", error: error.message });
      }
    });

    //update a single offer
    app.put("/updateOffer/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const promo = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateOffer = {
          $set: { ...promo }
        };

        const result = await offerCollection.updateOne(filter, updateOffer);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Offer not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating offer:", error);
        res.status(500).send({ message: "Failed to update offer", error: error.message });
      }
    });

    // delete single offer
    app.delete("/deleteOffer/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await offerCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Offer not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting offer:", error);
        res.status(500).send({ message: "Failed to delete offer", error: error.message });
      }
    });

    // post a shipping zone
    app.post("/addShippingZone", async (req, res) => {
      try {
        const shippingData = req.body;
        const result = await shippingZoneCollection.insertOne(shippingData);
        res.send(result);
      } catch (error) {
        console.error("Error adding shipping details:", error);
        res.status(500).send({ message: "Failed to add shipping details", error: error.message });
      }
    });

    // get all shipping zones
    app.get("/allShippingZones", async (req, res) => {
      try {
        const result = await shippingZoneCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching shipping zones:", error);
        res.status(500).send({ message: "Failed to fetch shipping zones", error: error.message });
      }
    });

    // delete single shipping zone
    app.delete("/deleteShippingZone/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await shippingZoneCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "shipping not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting shipping:", error);
        res.status(500).send({ message: "Failed to delete shipping", error: error.message });
      }
    });

    // get single shipping zone
    app.get("/getSingleShippingZone/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await shippingZoneCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "shipping not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching shipping zone:", error);
        res.status(500).send({ message: "Failed to fetch shipping zone", error: error.message });
      }
    });

    //update a single shipping zone
    app.put("/editShippingZone/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const zone = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateShippingZone = {
          $set: { ...zone }
        };

        const result = await shippingZoneCollection.updateOne(filter, updateShippingZone);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Shipping Zone not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating shipping zone:", error);
        res.status(500).send({ message: "Failed to update shipping zone", error: error.message });
      }
    });

    // post a shipment handler
    app.post("/addShipmentHandler", async (req, res) => {
      try {
        const shipmentData = req.body;
        const result = await shipmentHandlerCollection.insertOne(shipmentData);
        res.send(result);
      } catch (error) {
        console.error("Error adding shipment details:", error);
        res.status(500).send({ message: "Failed to add shipment details", error: error.message });
      }
    });

    // get all shipment handler
    app.get("/allShipmentHandlers", async (req, res) => {
      try {
        const result = await shipmentHandlerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching shipment handlers:", error);
        res.status(500).send({ message: "Failed to fetch shipment handlers", error: error.message });
      }
    });

    // delete single shipment handler
    app.delete("/deleteShipmentHandler/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await shipmentHandlerCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Shipment Handler not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting Shipment Handler:", error);
        res.status(500).send({ message: "Failed to delete Shipment Handler", error: error.message });
      }
    });

    // get single shipment handler
    app.get("/getSingleShipmentHandler/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await shipmentHandlerCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "shipment handler not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching shipment handler:", error);
        res.status(500).send({ message: "Failed to fetch shipment handler", error: error.message });
      }
    });

    //update a single shipment handler
    app.put("/editShipmentHandler/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const shipmentDetails = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateShipmentHandler = {
          $set: { ...shipmentDetails }
        };

        const result = await shipmentHandlerCollection.updateOne(filter, updateShipmentHandler);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Shipment handler not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating shipment handler:", error);
        res.status(500).send({ message: "Failed to update shipment handler", error: error.message });
      }
    });

    // post a payment method
    app.post("/addPaymentMethod", async (req, res) => {
      try {
        const paymentData = req.body;
        const result = await paymentMethodCollection.insertOne(paymentData);
        res.send(result);
      } catch (error) {
        console.error("Error adding payment method:", error);
        res.status(500).send({ message: "Failed to add payment method", error: error.message });
      }
    });

    // get all payment methods
    app.get("/allPaymentMethods", async (req, res) => {
      try {
        const result = await paymentMethodCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching payment method:", error);
        res.status(500).send({ message: "Failed to fetch payment method", error: error.message });
      }
    });

    // delete single Payment Method
    app.delete("/deletePaymentMethod/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await paymentMethodCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Payment Method not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting Payment Method:", error);
        res.status(500).send({ message: "Failed to delete Payment Method", error: error.message });
      }
    });

    // get single Payment Method
    app.get("/getSinglePaymentMethod/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await paymentMethodCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Payment Method not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Payment Method:", error);
        res.status(500).send({ message: "Failed to fetch Payment Method", error: error.message });
      }
    });

    //update a single payment method
    app.put("/editPaymentMethod/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const method = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatePaymentMethod = {
          $set: { ...method }
        };

        const result = await paymentMethodCollection.updateOne(filter, updatePaymentMethod);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Payment method not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating Payment method:", error);
        res.status(500).send({ message: "Failed to update Payment method", error: error.message });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Fashion-Commerce server is running");
})

app.listen(port, () => {
  console.log(`Fashion-Commerce server is running on port ${port}`);
})