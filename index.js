const express = require('express');
const app = express();
const path = require("path");
const mongoose = require('mongoose');
const chats = require("./models/chats.js");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/profile.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
require('dotenv').config();

const dburl = process.env.ATLAS_URL;
const apiKey ="AIzaSyBF2wMokYFjp5JgDy3gbVigFfTr6S6RC-U"  ; // Store your API key in .env

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// MongoDB Session Store
const store = MongoStore.create({
  mongoUrl: dburl,
  crypto: {
    secret: "dciudcdh",
  },
  touchAfter: 24 * 3600,
});

store.on("error", (error) => {
  console.log("ERROR in Mongo SESSION STORE", error);
});

// Session configuration
const sessionOptions = {
  store,
  secret: "hfwfgfuhfuwhfdh",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 1000 * 60 * 60,
    maxAge: 7 * 24 * 1000 * 60 * 60,
    httpOnly: true,
  },
};
app.use(session(sessionOptions));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Current User Middleware
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

// MongoDB Connection
async function main() {
  try {
    await mongoose.connect(dburl);
    console.log("Connection Successful");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}
main();

// Google Generative AI Setup
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Generate AI Response
async function run(promptMsg) {
  try {
    const prompt = promptMsg;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = await response.text(); // await here to correctly handle the Promise
    console.log(text);
    return text;
  } catch (e) {
    console.error("Error in AI Response:", e);
    return "An error occurred while processing your request.";
  }
}

// Routes
app.get("/chatsrender", async (req, res) => {
  try {
    let chating = await chats.find().populate("owner");
    res.render("../views/chat.ejs", { chating });
  } catch (e) {
    console.error("Error rendering chats:", e);
    res.redirect("/error"); // Redirect to a proper error page or handler
  }
});

app.post("/chatQ", async (req, res) => {
  try {
    let questionObject = req.body;
    let owner = req.user;
    let ownerid = owner._id;

    console.log(`owner:--${owner},,,,,,ownerid :--${ownerid}`);
    let question = questionObject.question;
    console.log(question);

    let answer = await run(`${question}`);
    console.log(answer);

    let newchat = new chats({
      question: question,
      answer: answer,
      owner: ownerid,
      created_at: new Date(),
    });

    await newchat.save(); // Await here to ensure saving is complete
    res.redirect("/chatsrender");
  } catch (e) {
    console.error("Error posting chat:", e);
    res.redirect("/chatsrender");
  }
});

app.get("/delete", (req, res) => {
  res.send("deleting ");
});

// User Routes
app.get("/user", (req, res) => {
  let userdetails = req.user;
  if (!userdetails) {
    console.log("Please log in first");
    res.redirect("/login");
  } else {
    console.log(userdetails);
    res.send(userdetails);
  }
});

// Signup Render Route
app.get("/signup", (req, res) => {
  res.render("../views/users/signup.ejs");
});

// Login Render Route
app.get("/login", (req, res) => {
  res.render("../views/users/login.ejs");
});

// Signup Logic
app.post("/signup", async (req, res) => {
  try {
    let { username, email, password } = req.body;
    console.log(username, email, password);

    let user = await User.findOne({ username: username });
    let alreadyuser = await User.findOne({ email: email });

    if (!user && !alreadyuser) {
      const newUser = new User({ email, username });
      const registeredUser = await User.register(newUser, password);
      console.log("Registered User:", registeredUser);
      res.redirect("/login");
    } else if (alreadyuser) {
      res.send("Email already exists");
    } else {
      res.send("Username already exists");
    }
  } catch (e) {
    console.error("Error during signup:", e);
    res.redirect("/signup");
  }
});

// Login Logic
app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/signup" }),
  async (req, res) => {
    try {
      let { username } = req.body;
      let user = await User.findOne({ username: username });

      if (!user) {
        // Redirecting to the signup page if user doesn't exist
        console.log("error", "Please sign up first."); // Use flash messages for better UX
        return res.redirect("/signup");
      }

      console.log("Logged In User:", user);
      res.redirect("/chatsrender");
    } catch (error) {
      console.error("Error during login:", error);
      res.redirect("/login");
    }
  }
);


// Logout Logic
app.get("/logout", (req, res, next) => {
  req.logout(function (error) {
    if (error) {
      return next(error);
    }
    
    res.redirect("/login");
   
  });
});

// Server Start
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
