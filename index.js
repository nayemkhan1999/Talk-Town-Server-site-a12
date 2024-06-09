const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  Timestamp,
} = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l4sutcp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    //Collection
    const forumCollection = client.db("TalkTime").collection("posts");
    const userCollection = client.db("TalkTime").collection("users");
    const announceCollection = client.db("TalkTime").collection("announce");
    const commentCollection = client.db("TalkTime").collection("comments");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });
    // MiddleWares VeriFy TOKEN
    // const verifyToken = (req, res, next) => {
    //   console.log("inside verify token", req.headers.authorization);
    //   if (!req.headers.authorization) {
    //     return res.status(401).send({ message: "forbidden access" });
    //   }
    //   const token = req.headers.authorization.split(" ")[1];
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     if (err) {
    //       return res.status(401).send({ message: "forbidden access" });
    //     }
    //     req.decoded = decoded;
    //     next();
    //   });
    // };
    // =================Making Role Admin & User===========================
    app.get("/Role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      const role = result.role;
      res.send({ role });
    });
    //==============When user login store on data save mongodb 2nd time user login then msg already exist user==============
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Admin AnnounceMent Post method
    app.post("/announce", async (req, res) => {
      const mic = req.body;
      const result = await announceCollection.insertOne(mic);
      res.send(result);
    });
    // Same just for get method
    app.get("/announce", async (req, res) => {
      const result = await announceCollection.find().toArray();
      res.send(result);
    });
    // Admin can see all user details
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/allData", async (req, res) => {
      const allUser = await userCollection.countDocuments();
      const allPost = await forumCollection.countDocuments();
      res.send([allUser, allPost]);
    });

    //===================Update a user role============
    app.patch("/userRoleChange/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = req.body;
      const updateDoc = {
        $set: { role: user.changeRole },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.patch("/badge/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = req.body;

      const update = {
        $set: {
          badge: user.newBadge,
        },
      };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });
    app.get("/userProfile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // Add Post user can post
    app.post("/addedPost", async (req, res) => {
      const addPost = req.body;
      const result = await forumCollection.insertOne(addPost);
      res.send(result);
    });

    // comment post on dataBase
    app.post("/userComment", async (req, res) => {
      const addComment = req.body;
      const result = await commentCollection.insertOne(addComment);
      res.send(result);
    });
    // comment get on dataBase
    app.get("/allComment", async (req, res) => {
      const result = await commentCollection.find().toArray();
      res.send(result);
    });
    // All Post Method
    app.get("/allPost", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);

      try {
        const totalPosts = await forumCollection.countDocuments();
        const result = await forumCollection.find().toArray();

        res.send({ posts: result, totalPosts });
      } catch (error) {
        res
          .status(500)
          .send({ error: "An error occurred while fetching posts." });
      }
    });

    // This user see own his post
    app.get("/allPost/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await forumCollection.find(query).toArray();
      res.send(result);
    });

    // My post theke Post Delete kora
    app.delete("/allPost/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await forumCollection.deleteOne(query);
      res.send(result);
    });

    // ===================================
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Talk Time is Running on server");
});

app.listen(port, () => {
  console.log(`Talk Time is running on the server site,${port}`);
});
