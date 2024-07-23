const mongoose = require('mongoose');
const user=require("./profile.js")

const chatschema = new mongoose.Schema({
  question: {
    type : String,
    required :true
  },
  answer:{
    type:String,
    required :true
  },
  owner:{
    type:mongoose.Schema.Types.ObjectId,
    ref:user,
  },
  created_at :{
    type:Date,
    required:true
  }
});


const chat = mongoose.model("Chat", chatschema);
module.exports=chat;
