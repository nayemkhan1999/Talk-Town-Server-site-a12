const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const forumCollection = client
      .db("TalkTime")
      .collection("talkTimeCollection");

    // Add Post user can post
    app.post("/addedPost", async (req, res) => {
      const addPost = req.body;
      const result = await forumCollection.insertOne(addPost);
      res.send(result);
    });
    // All Post Method
    app.get("/allPost", async (req, res) => {
      const result = await forumCollection.find().toArray();
      res.send(result);
    });
    // This user see own his post
    app.get("/allPost/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await forumCollection.find(query).toArray();
      res.send(result);
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
