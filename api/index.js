const express = require('express');
const cors =  require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const serverless = require('serverless-http');
require('dotenv').config() // very much important
const app = express();
const port = process.env.PORT || 3000;

//middleware
// app.use(cors());
app.use(cors({
    origin: 'http://localhost:5173', // Where your React app is running
    credentials: true               // Allow cookies to be shared
}));
app.use(express.json());
app.use(cookieParser());

const logger = (req,res,next)=>{
  console.log("Inside the logger");
  next();
  
}
//Validation of Token
const verifyToken = (req,res,next)=>{

  console.log("Inside Verify Token Middleware",req.cookies);

  const token = req.cookies?.token;

// if there is no token
  if(!token)
  {
    console.log('No Token');
    
    return res.status(401).send({message:"Unauthorized Access"});
  }

  jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
   //  There is token but not the correct one or expired token
    if(err){
      console.log("Error : ",err);
      
      return res.status(401).send({message:"Unauthorized Access"});
    }
     req.user = decoded;
     next();

  })
 
  
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ditdntn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();
    
    //job related API's
    const database = client.db("job_portal");
    const jobCollection = database.collection("jobs");
    const jobApplicationCollection = database.collection("job_applications");

    // Auth Related APIs
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.JWT_SECRET,{expiresIn:'1h'});
      res.cookie('token',token,{
        httpOnly:true,
        secure:false, //Set true in production for HTTPS.In localhost-->http(false) & in production -->https(true)
        // sameSite:strict,
      })
      .send({success:true});

    });
// I won't add verifytoken to this API cause if I do it my project will not run as validation of token will run earlier before generating token.
// SO I will get Unauthorized message.Wherever I need authentication I will add this verifyToken
    app.get('/jobs',logger,async(req,res)=>{
      console.log('Now inside the jobs API');
      
      const email = req.query.email;
      let query = {};
     
      
      //  console.log("Cookies Cookies Cookies",req.cookies);
      // if(req.user.email !== req.query.email)
      // {
      //    return res.status(403).send({message:"Access Forbidden"});
      // }

      if(email)
      {
        query = {hr_email : email}
      }
      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);

    });

    app.get('/jobs/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await jobCollection.findOne(query);
      res.send(result);

    });

    app.get('/job-applications',async(req,res)=>{
      const email = req.query.email;
      const query = {applicant_email : email};
      const result = await jobApplicationCollection.find(query).toArray();

      //fakira way to aggregate data
       for(const x of result)
       {
         console.log(x.job_id);
         const query1 = { _id : new ObjectId(x.job_id)};
         const result1 = await jobCollection.findOne(query1);
         if(result1)
         {
           x.title = result1.title;
           x.company = result1.company;
           x.company_logo= result1.company_logo;
           x.location = result1.location;
           x.description = result1.description;
           x.category = result1.category;
         }
         
       }

       res.send(result);

    });

    app.get("/job-application/jobs/:job_id",async(req,res)=>{
      const jobId = req.params.job_id;
      const query = {job_id : jobId};
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    })

   //job application API's
    app.post('/job-applications',async(req,res)=>{
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);

      //Not the best way(use aggregate)
      const id = application.job_id;
      const query = {_id: new ObjectId(id)};
      const job = await jobCollection.findOne(query);
      // console.log(job);
      let count = 0;
      if(job.applicationCount)
      {
        count = job.applicationCount+1;
      }

      else
      {
        count = 1;
      }

      //update the job info
      const filter = {_id: new ObjectId(id)};

      const updatedDoc = {
        $set:{
          applicationCount:count
        }
      }

      const updateResult = await jobCollection.updateOne(filter,updatedDoc);
      


      res.send(result);

    });

    app.post("/jobs",async(req,res)=>{
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    app.patch('/job-applications/:id',async(req,res)=>{
      const id = req.params.id;
      const data = req.body;
      const filter = { _id : new ObjectId(id)};
      const updatedDoc = {
        $set:{
          status:data.status
        }
      }

      const result = await jobApplicationCollection.updateOne(filter,updatedDoc);
      res.send(result);

    });





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/',(req,res)=>{
    res.send('Server is working');
})

// app.listen(port,()=>{
//     console.log('Server is working on Port : ',port);
    
// })

module.exports = app;
module.exports.handler = serverless(app);