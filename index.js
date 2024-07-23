const express = require('express');
const app = express()
const path = require("path");
const mongoose = require('mongoose');
const chats =require("../Gemini AI API/models/chats.js");
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
const passport =require("passport");
const LocalStrategy =require("passport-local");
const User =require("./models/profile.js");
const  session =require("express-session");
const MongoStore = require('connect-mongo');

require('dotenv').config();
const dburl = process.env.ATLAS_URL;


const store = MongoStore.create({
  mongoUrl:dburl,
  crypto:{
     secret :"dciudcdh",
  },
  touchAfter:24*3600,
});
 
 store.on("error",()=>{
  console.log("ERROR in Mongo SESSION STORE",error)
 })



//session cookies send 
const sessionOptions={
  store,
  secret :"hfwfgfuhfuwhfdh",
  resave:false,
  saveUninitialized:true,
  cookie:{
    expires: Date.now()+7*24*1000*60*60,
    maxAge:7*24*1000*60*60,
    httpOnly:true,
  },
}
app.use(session(sessionOptions));


//passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//locals 
app.use((req,res,next)=>{
  res.locals.currentUser=req.user;
  next();
})

app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname,"/public")));
main().then(() => {
  console.log("Connection Sucessfull");
})
  .catch(err => console.log(err));

async function main() {
  await mongoose.connect(dburl);
}

const { GoogleGenerativeAI } = require("@google/generative-ai");


// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI("AIzaSyBF2wMokYFjp5JgDy3gbVigFfTr6S6RC-U");

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

async function run(promptMsg) {
 try{
  const prompt = promptMsg;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log(text);
  return text;
 } catch(e){
  console.log(e);
  res.redirect("/chatsrender");
 }
}


app.get("/chatsrender",async(req,res)=>{
let chating= await chats.find().populate("owner");
// console.log(chating);
  res.render("../views/chat.ejs",{chating});
})
app.post("/chatQ",async(req,res)=>{
  try{

  
let questionObject=req.body;
let owner=req.user;
let ownerid= owner._id;
console.log(`owner:--${owner},,,,,,ownerid :--${ownerid}`);
let question= questionObject.question;
console.log(question);
let answer= await run(`${question}`);
console.log(answer);
let newchat = new chats({
  question:question,
  answer:answer,
  owner:ownerid,
  created_at: new Date(),
});
newchat.save()
  .then(res => {
    console.log(res);
  })
res.redirect("/chatsrender");
  }
  catch(e){
    console.log(e);
    res.redirect("chatsrender");
  }

})
app.get("/delete",(req,res)=>{
  res.send("deleting ");
})



// user routings 
app.get("/user",(req,res)=>{
  let userdetails =req.user;
  if(!userdetails){
    console.log("please logion fist");
    res.redirect("/login");
  }else{
    console.log(userdetails);
    res.send(userdetails);
  }
 
})
// signup render route
app.get("/signup",(req,res)=>{
  res.render("../views/users/signup.ejs");
})
// login render route
app.get("/login",(req,res)=>{
  res.render("../views/users/login.ejs");
})

// signu logic 
app.post("/signup",async(req,res)=>{
  try{
    let {username,email,password}=req.body;
    console.log(username,email,password);
    let user =await User.findOne({username:username});
    let alreadyuser =await User.findOne({email:email});
    if(!user){
      if(!alreadyuser){
        const newUser = new User({ email, username });
        
        const registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
        res.redirect("/chatsrender");
      }else{
        res.send("Email already Exists");
      }
     
    }else{
      res.send("Username Already Exists");
    }
    
  }
  catch(e){
    console.log(e);
    res.redirect("/chatsrender");
  }
  
})
//login logic
app.post("/login",passport.authenticate("local",{failureRedirect:"/login",}),async(req,res)=>{
  let { username}= req.body;
  let user =await User.findOne({username:username});
  if(!user){
console.log("plesase signup fiorst ");
res.redirect("/signup");
  }else{
  console.log(user);
  res.redirect("/chatsrender");}
})
//logout logic
app.get("/logout",(req,res)=>{
  req.logout((error)=>{
    if(error){
      return next(error);
    }
    res.redirect("/chatsrender");
  });
})



app.listen(3000,()=>{
  console.log("server running");
  
})


