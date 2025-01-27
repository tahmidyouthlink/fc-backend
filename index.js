const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT | 5000;
require("dotenv").config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const cors = require("cors");

const storage = multer.memoryStorage();
const upload = multer({ storage });

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
    const locationCollection = client.db("fashion-commerce").collection("locations");
    const purchaseOrderCollection = client.db("fashion-commerce").collection("purchase-order");
    const transferOrderCollection = client.db("fashion-commerce").collection("transfer-order");
    const marketingBannerCollection = client.db("fashion-commerce").collection("marketing-banner");
    const loginRegisterSlideCollection = client.db("fashion-commerce").collection("login-register-slide");
    const heroBannerCollection = client.db("fashion-commerce").collection("hero-banner");
    const newsletterCollection = client.db("fashion-commerce").collection("news-letter");

    // Define route to handle file upload to cloudinary
    app.post('/uploadFile', upload.single('attachment'), (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Determine file type for Cloudinary storage type
      const fileType = req.file.mimetype.split('/')[0];

      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: fileType === 'image' ? 'image' : 'raw' },
        (error, result) => {
          if (error) {
            console.error('Error uploading file to Cloudinary:', error);
            return res.status(500).json({ message: 'Cloudinary upload failed', error: error.message });
          }
          res.json({ fileUrl: result.secure_url });
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

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

    app.get("/allSpecificProducts", async (req, res) => {
      try {
        // Define the projection to include only the specified fields
        const projection = {
          productTitle: 1,
          restOfOutfit: 1,
          sizeGuideImageUrl: 1,
          productVariants: 1,
          salesThisMonth: 1,
          status: 1,
          productId: 1,
          category: 1,
          regularPrice: 1,
          discountValue: 1,
          batchCode: 1,
          weight: 1,
          productDetails: 1,
          availableColors: 1,
          newArrival: 1,
          materialCare: 1,
          sizeFit: 1,
          groupOfSizes: 1,
          allSizes: 1,
          discountType: 1,
          publishDate: 1
        };

        // Fetch all products with the specified fields
        const result = await productInformationCollection
          .find({}, { projection }) // Apply projection here
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send({ message: "Failed to fetch product details", error: error.message });
      }
    });

    // Get all unique sizes
    app.get("/allSizes", async (req, res) => {
      try {
        // Fetch all products
        const products = await productInformationCollection.find().toArray();

        // Extract all sizes from the products
        const allSizes = products.flatMap(product => product.allSizes || []);

        // Create a unique set of sizes
        const uniqueSizes = [...new Set(allSizes)];

        // Respond with both arrays
        res.send(uniqueSizes);
      } catch (error) {
        console.error("Error fetching sizes:", error);
        res.status(500).send({ message: "Failed to fetch sizes", error: error.message });
      }
    });

    // Get all unique color names
    app.get("/allUniqueColors", async (req, res) => {
      try {
        // Fetch all products
        const products = await productInformationCollection.find().toArray();

        // Extract all color names from the availableColors array
        const allColors = products.flatMap(product =>
          product.availableColors?.map(color => color.value) || []
        );

        // Create a unique set of color names
        const uniqueColors = [...new Set(allColors)];

        // Respond with the unique color names
        res.send(uniqueColors);
      } catch (error) {
        console.error("Error fetching colors:", error);
        res.status(500).send({ message: "Failed to fetch colors", error: error.message });
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

    app.put("/editProductDetailsInventory/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { _id, ...productDetails } = req.body;
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

    app.put("/decreaseSkuFromProduct", async (req, res) => {

      const productDetailsArray = req.body;

      // Validate the input array
      if (!Array.isArray(productDetailsArray) || productDetailsArray.length === 0) {
        return res.status(400).json({ error: "No product details provided or invalid format" });
      }

      try {

        const primaryLocation = await locationCollection.findOne({ isPrimaryLocation: true });
        if (!primaryLocation) {
          return res.status(400).json({ error: "Primary location not found" });
        }

        const { locationName } = primaryLocation;

        const updateResults = [];
        for (const productDetails of productDetailsArray) {

          const { productId, sku, size, color } = productDetails;

          if (!productId || !sku || !size || !color) {
            return res.status(400).json({ error: "Missing details in request body" });
          };

          // Step 3: Find the product and match variants
          const product = await productInformationCollection.findOne({ productId });
          if (!product) {
            updateResults.push({ productId, error: "Product not found" });
            continue;
          }

          const matchingVariant = product?.productVariants?.find(
            (variant) =>
              variant.size === size &&
              variant.color._id === color._id &&
              variant.location === locationName
          );

          if (!matchingVariant) {
            updateResults.push({ productId, error: "Matching product variant not found" });
            continue;
          }

          // Step 4: Check if SKU can be subtracted
          if (matchingVariant.sku < sku) {
            updateResults.push({ productId, error: "SKU to subtract exceeds current SKU" });
            continue;
          }

          // Step 5: Subtract SKU and update the product
          matchingVariant.sku -= sku;

          const updateResult = await productInformationCollection.updateOne(
            {
              productId,
              productVariants: {
                $elemMatch: {
                  size: size,
                  color: color,
                  location: locationName,
                  sku: { $gte: sku }, // Ensure enough SKU to subtract
                },
              },
            },
            {
              $inc: { "productVariants.$.sku": -sku }, // Decrement the SKU
            }
          );


          if (updateResult.modifiedCount === 0) {
            updateResults.push({ productId, error: "Failed to update SKU" });
          } else {
            updateResults.push({
              productId,
              updatedVariant: { size, color, location: locationName, sku: matchingVariant.sku },
            });
          }
        }

        // Return response with results of all products
        return res.status(200).json({ message: "SKU update process completed", results: updateResults });

      } catch (error) {
        console.error("Error updating SKU:", error.message);
        return res.status(500).json({ error: "Internal server error" });
      }


    })

    app.put("/decreaseOnHandSkuFromProduct", async (req, res) => {

      const productDetailsArray = req.body;

      // Validate the input array
      if (!Array.isArray(productDetailsArray) || productDetailsArray.length === 0) {
        return res.status(400).json({ error: "No product details provided or invalid format" });
      }

      try {

        const primaryLocation = await locationCollection.findOne({ isPrimaryLocation: true });
        if (!primaryLocation) {
          return res.status(400).json({ error: "Primary location not found" });
        }

        const { locationName } = primaryLocation;

        const updateResults = [];
        for (const productDetails of productDetailsArray) {

          const { productId, sku, size, color, onHandSku } = productDetails;

          if (!productId || !sku || !size || !color || !onHandSku) {
            return res.status(400).json({ error: "Missing details in request body" });
          };

          // Step 3: Find the product and match variants
          const product = await productInformationCollection.findOne({ productId });
          if (!product) {
            updateResults.push({ productId, error: "Product not found" });
            continue;
          }

          const matchingVariant = product?.productVariants?.find(
            (variant) =>
              variant.size === size &&
              variant.color._id === color._id &&
              variant.location === locationName
          );

          if (!matchingVariant) {
            updateResults.push({ productId, error: "Matching product variant not found" });
            continue;
          }

          // Step 4: Check if SKU can be subtracted
          if (matchingVariant.onHandSku < onHandSku) {
            updateResults.push({ productId, error: "SKU to subtract exceeds current SKU" });
            continue;
          }

          // Step 5: Subtract SKU and update the product
          matchingVariant.onHandSku -= onHandSku;

          const updateResult = await productInformationCollection.updateOne(
            {
              productId,
              productVariants: {
                $elemMatch: {
                  size: size,
                  color: color,
                  location: locationName,
                  onHandSku: { $gte: onHandSku }, // Ensure enough SKU to subtract
                },
              },
            },
            {
              $inc: { "productVariants.$.onHandSku": -onHandSku }, // Decrement the SKU
            }
          );


          if (updateResult.modifiedCount === 0) {
            updateResults.push({ productId, error: "Failed to update SKU" });
          } else {
            updateResults.push({
              productId,
              updatedVariant: { size, color, location: locationName, onHandSku: matchingVariant.onHandSku },
            });
          }
        }

        // Return response with results of all products
        return res.status(200).json({ message: "SKU update process completed", results: updateResults });

      } catch (error) {
        console.error("Error updating SKU:", error.message);
        return res.status(500).json({ error: "Internal server error" });
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

    // get product info via season name
    app.get("/productFromSeason/:seasonName", async (req, res) => {
      try {
        const seasonName = req.params.seasonName;
        const query = { season: seasonName };
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

    app.patch("/updateFeaturedCategories", async (req, res) => {
      const categoriesToUpdate = req.body; // Array of category objects with label and isFeatured fields
      let modifiedCount = 0;

      try {
        // Loop through each category and update its isFeatured status
        for (const category of categoriesToUpdate) {
          const result = await categoryCollection.updateOne(
            { label: category.label }, // Find category by label
            { $set: { isFeatured: category.isFeatured } } // Set the isFeatured field
          );

          // Increment the modifiedCount if a document was modified
          if (result.modifiedCount > 0) {
            modifiedCount += result.modifiedCount;
          }
        }

        console.log(modifiedCount);


        // Respond with the modifiedCount
        res.status(200).send({ modifiedCount });
      } catch (error) {
        console.error("Error updating featured category:", error);
        res.status(500).send({ message: "Failed to update featured categories", error: error.message });
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
      const { orderStatus, trackingNumber, selectedShipmentHandlerName, shippedAt, deliveredAt, trackingUrl, imageUrl, isUndo, onHoldReason, declinedReason, returnInfo } = req.body; // Extract status from request body

      // Define valid statuses
      const validStatuses = [
        "Pending",
        "Processing",
        "Shipped",
        "On Hold",
        "Delivered",
        "Return Requested",
        "Request Accepted",
        "Request Declined",
        "Return Initiated",
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

        const updateDoc = {};

        if (isUndo) {
          // Undo logic: Revert to the previous status
          updateDoc.$set = {
            orderStatus: orderStatus,
            previousStatus: order.orderStatus, // Store the current status as the previous status
            lastStatusChange: new Date(),                 // Update the timestamp for undo
          };
        } else {
          updateDoc.$set = {
            orderStatus: orderStatus,
            previousStatus: order.orderStatus, // Save the current status as the previous status
            lastStatusChange: new Date(),      // Record the timestamp of the status change
          };

          // Add shipping-related fields if `orderStatus` is `Shipped`
          if (orderStatus === "Shipped") {
            if (!trackingNumber || !selectedShipmentHandlerName) {
              return res.status(400).json({ error: "Tracking data is required for 'Shipped' status" });
            }

            // Store all shipping-related fields inside `shipmentInfo` object
            updateDoc.$set.shipmentInfo = {
              trackingNumber,
              selectedShipmentHandlerName,
              trackingUrl,
              imageUrl,
              shippedAt: new Date(shippedAt || Date.now()),
            };
          }

          // Add delivery-related fields if `orderStatus` is `Delivered`
          if (orderStatus === "Delivered") {
            updateDoc.$set.deliveryInfo = {
              ...(order.deliveryInfo || {}), // Retain existing shipmentInfo fields if present
              deliveredAt: new Date(deliveredAt || Date.now()), // Add or update `deliveredAt` field
            };
          }

          // Add delivery-related fields if `orderStatus` is `On Hold`
          if (orderStatus === "On Hold") {

            if (!onHoldReason) {
              return res.status(400).json({ error: "On hold reason is required for 'On Hold' status" });
            }

            // Store all shipping-related fields inside `shipmentInfo` object
            updateDoc.$set.onHoldReason = onHoldReason;

          }

          // Add delivery-related fields if `orderStatus` is `On Hold`
          if (orderStatus === "Return Requested") {

            if (!returnInfo) {
              return res.status(400).json({ error: "Return Requested is required for 'Return Requested' status" });
            }

            // Store all shipping-related fields inside `shipmentInfo` object
            updateDoc.$set.returnInfo = returnInfo;

          }

          // Add delivery-related fields if `orderStatus` is `On Hold`
          if (orderStatus === "Request Declined") {

            if (!declinedReason) {
              return res.status(400).json({ error: "Declined reason is required for 'Request Declined' status" });
            }

            // Store all shipping-related fields inside `shipmentInfo` object
            updateDoc.$set.declinedReason = declinedReason;

          }

        }

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

    // Get Customer Details by Email
    app.get('/customerDetailsViaEmail/:email', async (req, res) => {
      const email = req.params.email; // Retrieve email from query parameters

      if (!email) {
        return res.status(400).send('Email is required'); // Validate input
      };

      try {
        const customer = await customerListCollection.findOne({ email }); // Query the database
        if (!customer) {
          return res.status(404).send('Customer not found'); // Handle case where no customer is found
        }
        res.status(200).send(customer); // Send customer details
      } catch (error) {
        res.status(500).send(error.message); // Handle server errors
      }
    });

    // Update user details by _id
    app.put("/updateUserInformation/:id", async (req, res) => {
      const id = req.params.id; // Retrieve _id from the request parameters
      let updatedData = req.body; // New data from the request body

      try {
        // Remove the _id field if it exists in the updatedData
        if (updatedData._id) {
          delete updatedData._id;
        }

        console.log(updatedData, "updatedData");

        const result = await customerListCollection.updateOne(
          { _id: new ObjectId(id) }, // Match the document by its _id
          { $set: { ...updatedData } } // Set the new data for specific user information
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "No data found with this ID" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating data:", error);
        res.status(500).send({ message: "Failed to update data", error: error.message });
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

    // post a location
    app.post("/addLocation", async (req, res) => {
      try {
        const locationData = req.body;

        // If the location is set as primary, update all other locations to set `isPrimaryLocation` to false
        if (locationData.isPrimaryLocation) {
          await locationCollection.updateMany({ isPrimaryLocation: true }, { $set: { isPrimaryLocation: false } });
        }

        // Insert the new location
        const result = await locationCollection.insertOne(locationData);

        res.send(result);
      } catch (error) {
        console.error("Error adding location:", error);
        res.status(500).send({ message: "Failed to add location", error: error.message });
      }
    });

    // get all locations
    app.get("/allLocations", async (req, res) => {
      try {
        const result = await locationCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching locations:", error);
        res.status(500).send({ message: "Failed to fetch locations", error: error.message });
      }
    });

    // delete single location
    app.delete("/deleteLocation/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await locationCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Location not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting Location:", error);
        res.status(500).send({ message: "Failed to delete Location", error: error.message });
      }
    });

    // Update a single location
    app.put("/updateLocation/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const locationData = req.body;

        // If the updated location is set as primary, update all other locations to set `isPrimaryLocation` to false
        if (locationData.isPrimaryLocation) {
          await locationCollection.updateMany({ isPrimaryLocation: true }, { $set: { isPrimaryLocation: false } });
        }

        // Update the specific location
        const filter = { _id: new ObjectId(id) };
        const updateLocation = {
          $set: { ...locationData }
        };

        const result = await locationCollection.updateOne(filter, updateLocation);

        // Handle case where no location was found
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Location not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).send({ message: "Failed to update location", error: error.message });
      }
    });

    // get single location info
    app.get("/getSingleLocationDetails/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await locationCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Location not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Location:", error);
        res.status(500).send({ message: "Failed to fetch Location", error: error.message });
      }
    });

    // post a purchase order
    app.post("/addPurchaseOrder", async (req, res) => {
      try {
        const purchaseOrderData = req.body;
        const result = await purchaseOrderCollection.insertOne(purchaseOrderData);
        res.send(result);
      } catch (error) {
        console.error("Error adding purchase order:", error);
        res.status(500).send({ message: "Failed to add purchase order", error: error.message });
      }
    });

    // get all purchase orders
    app.get("/allPurchaseOrders", async (req, res) => {
      try {
        const result = await purchaseOrderCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching purchase order:", error);
        res.status(500).send({ message: "Failed to fetch purchase order", error: error.message });
      }
    });

    // delete single purchase order
    app.delete("/deletePurchaseOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await purchaseOrderCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Purchase order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting purchase order:", error);
        res.status(500).send({ message: "Failed to delete purchase order", error: error.message });
      }
    });

    // get single purchase order
    app.get("/getSinglePurchaseOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await purchaseOrderCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Purchase order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Purchase order:", error);
        res.status(500).send({ message: "Failed to fetch Purchase order", error: error.message });
      }
    });

    //update a single purchase order
    app.put("/editPurchaseOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const order = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatePurchaseOrder = {
          $set: { ...order }
        };

        const result = await purchaseOrderCollection.updateOne(filter, updatePurchaseOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Purchase order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating purchase order:", error);
        res.status(500).send({ message: "Failed to update purchase order", error: error.message });
      }
    });

    // post a transfer order
    app.post("/addTransferOrder", async (req, res) => {
      try {
        const transferOrderData = req.body;
        const result = await transferOrderCollection.insertOne(transferOrderData);
        res.send(result);
      } catch (error) {
        console.error("Error adding transfer order:", error);
        res.status(500).send({ message: "Failed to add transfer order", error: error.message });
      }
    });

    // get all transfer orders
    app.get("/allTransferOrders", async (req, res) => {
      try {
        const result = await transferOrderCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching transfer orders:", error);
        res.status(500).send({ message: "Failed to fetch transfer orders", error: error.message });
      }
    });

    // get single transfer order
    app.get("/getSingleTransferOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await transferOrderCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Transfer order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching Transfer order:", error);
        res.status(500).send({ message: "Failed to fetch Transfer order", error: error.message });
      }
    });

    //update a single transfer order
    app.put("/editTransferOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const order = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateTransferOrder = {
          $set: { ...order }
        };

        const result = await transferOrderCollection.updateOne(filter, updateTransferOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Transfer order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating transfer order:", error);
        res.status(500).send({ message: "Failed to update transfer order", error: error.message });
      }
    });

    // delete single transfer order
    app.delete("/deleteTransferOrder/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await transferOrderCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Transfer order not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting transfer order:", error);
        res.status(500).send({ message: "Failed to delete transfer order", error: error.message });
      }
    });

    // post a marketing banner
    app.post("/addMarketingBanner", async (req, res) => {
      try {
        const marketingBannerData = req.body;
        const result = await marketingBannerCollection.insertOne(marketingBannerData);
        res.send(result);
      } catch (error) {
        console.error("Error adding marketing banner:", error);
        res.status(500).send({ message: "Failed to add marketing banner", error: error.message });
      }
    });

    //update a single login register image urls
    app.put("/editMarketingBanner/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const urls = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateUrlOrder = {
          $set: { ...urls }
        };

        const result = await marketingBannerCollection.updateOne(filter, updateUrlOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Login register image urls not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating login register image urls:", error);
        res.status(500).send({ message: "Failed to update login register image urls", error: error.message });
      }
    });

    // get all marketing banner
    app.get("/allMarketingBanners", async (req, res) => {
      try {
        const result = await marketingBannerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching marketing banner:", error);
        res.status(500).send({ message: "Failed to fetch marketing banner", error: error.message });
      }
    });

    // post a login register slides
    app.post("/addLoginRegisterImageUrls", async (req, res) => {
      try {
        const loginRegisterImageUrlsData = req.body;
        const result = await loginRegisterSlideCollection.insertOne(loginRegisterImageUrlsData);
        res.send(result);
      } catch (error) {
        console.error("Error adding login register slides:", error);
        res.status(500).send({ message: "Failed to add login register slides", error: error.message });
      }
    });

    // get all login register slides
    app.get("/allLoginRegisterImageUrls", async (req, res) => {
      try {
        const result = await loginRegisterSlideCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching login register slides:", error);
        res.status(500).send({ message: "Failed to fetch login register slides", error: error.message });
      }
    });

    //update a single login register image urls
    app.put("/editLoginRegisterImageUrls/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const urls = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateUrlOrder = {
          $set: { ...urls }
        };

        const result = await loginRegisterSlideCollection.updateOne(filter, updateUrlOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Login register image urls not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating login register image urls:", error);
        res.status(500).send({ message: "Failed to update login register image urls", error: error.message });
      }
    });

    // post a hero banner slides
    app.post("/addHeroBannerImageUrls", async (req, res) => {
      try {
        const heroBannerImageUrlsData = req.body;
        const result = await heroBannerCollection.insertOne(heroBannerImageUrlsData);
        res.send(result);
      } catch (error) {
        console.error("Error adding hero banner slides:", error);
        res.status(500).send({ message: "Failed to add hero banner slides", error: error.message });
      }
    });

    // get all hero banner slides
    app.get("/allHeroBannerImageUrls", async (req, res) => {
      try {
        const result = await heroBannerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching hero banner slides:", error);
        res.status(500).send({ message: "Failed to fetch hero banner slides", error: error.message });
      }
    });

    //update a single hero banner image urls
    app.put("/editHeroBannerImageUrls/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const urls = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateUrlOrder = {
          $set: { ...urls }
        };

        const result = await heroBannerCollection.updateOne(filter, updateUrlOrder);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "hero banner image urls not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating hero banner image urls:", error);
        res.status(500).send({ message: "Failed to update hero banner image urls", error: error.message });
      }
    });

    // post a newsletter
    app.post("/addNewsletter", async (req, res) => {
      try {
        const newsletterData = req.body;
        const result = await newsletterCollection.insertOne(newsletterData);
        res.send(result);
      } catch (error) {
        console.error("Error adding newsletter:", error);
        res.status(500).send({ message: "Failed to add newsletter", error: error.message });
      }
    });

    // get all newsletters
    app.get("/allNewsletters", async (req, res) => {
      try {
        const result = await newsletterCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching newsletters:", error);
        res.status(500).send({ message: "Failed to fetch newsletters", error: error.message });
      }
    });

    // get single newsletter via email
    app.get("/getSingleNewsletter/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await newsletterCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "newsletter not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching newsletter:", error);
        res.status(500).send({ message: "Failed to fetch newsletter", error: error.message });
      }
    });

    // delete single newsletter
    app.delete("/deleteNewsletter/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await newsletterCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "newsletter not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting newsletter:", error);
        res.status(500).send({ message: "Failed to delete newsletter", error: error.message });
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