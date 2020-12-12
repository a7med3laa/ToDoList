//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose= require("mongoose");
const _ = require("lodash");
const https=require("https");


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));



///////////////////////////////////////////////////
//connect to DB
mongoose.connect("mongodb+srv://"+ process.env.DB_USER+":"+process.env.DB_PASS+"@"+process.env.DB_HOST, {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB Connection error"));

//define schema
const itemSchema = {
  name : String
};

//define schma model
const Item=mongoose.model("Item",itemSchema);

//add item to model
const item1=Item({
  name:"Welcome to your toDoList!!"
});

const item2=Item({
  name:"Hit the + buttom to add a new item or checkbox to delete"
});
// array of items
const defaultItems= [item1, item2];

//new schema for any lists
const listSchema ={
  name: String,
  items: [itemSchema]
};

const List = mongoose.model("List" , listSchema);


//////////////////////////////////////////////////////
//get weather

const queryCity= "cairo";
var weatherResult;
const url="https://api.openweathermap.org/data/2.5/weather?&units=metric&q="+queryCity+"&appid="+process.env.APP_ID;

https.get(url,function (result) {

  result.on("data", function (data) {
    
     const weatherData= JSON.parse(data);
     const weatherTemp=weatherData.main.temp;
     const weatherDescription=weatherData.weather[0].description;
     const icon= weatherData.weather[0].icon;
     const imageUrl="http://openweathermap.org/img/wn/"+icon+"@2x.png";
     
     weatherResult= "<h6>"+ _.capitalize(queryCity)+" "+ weatherTemp+ " C</h6>"+
     "<h6>"+  _.capitalize(weatherDescription) +"</h6>";
     
  });
  });

// date of day

  var today = new Date();
  var date =today.toLocaleTimeString();
  var options={
     weekday:"long",
     day:"numeric",
     month:"long"
  }
  
  
  var day= today.toLocaleDateString("en-US",options);
  var newdate = "<h6> "+day+ "</h6>"+ "<h6> "+date+"</h6>";

/////////////////////////////////////////////////////////


// get root route
app.get("/", function(req, res) {


  Item.find({},function(err,foundItems){
    
    if (foundItems.length === 0) {
    //insert document array in Item model
    Item.insertMany(defaultItems, function(err){
     if(!err){
      console.log("Succesfully saved in DB");
     }}); 
     res.redirect("/");
    } else{
    // List is already created and has items
    res.render("list", {listTitle: "Today", newListItems: foundItems, weather : weatherResult, date : newdate});
    }
});

});

/////////////////////////////////////////////////////

// Post to root route
app.post("/", function(req, res){

  const itemName = req.body.newItem;

  const listName = req.body.list;

if (itemName!="") {
  

  const item=new Item({
    name : itemName
  });

  if (listName ==="Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name : listName}, function(err,foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/"+listName);
    });
  }
}

});

/////////////////////////////////////////////////////

app.post("/delete", function(req,res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName; 

  if (listName ==="Today") {
    Item.findByIdAndRemove(checkedItemId, function(err){
    if(!err){
        console.log("Successfully deleted checked item");
  
      }
    });
    res.redirect("/");
  } else {
    List.findOneAndUpdate({name : listName} , {$pull: {items: {_id : checkedItemId}}} ,function (err, foundList) {
      if (!err) {
        res.redirect("/"+listName);
      }
    });
  }
  
});

/////////////////////////////////////////////////////

app.get("/:customListName", function(req,res){
const customListName=_.capitalize(req.params.customListName);

List.findOne({name: customListName},function (err,foundList){
if (!err) {
  if (!foundList) {
  // create new list
  const list = new List({
  name: customListName,
  items: defaultItems
  });

  list.save();
  res.redirect("/" + customListName);

  } else {
  // show an existing list
  res.render("list", {listTitle: foundList.name, newListItems: foundList.items
    , weather : weatherResult, date : newdate});
}}});



});

/////////////////////////////////////////////////////

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Server has started successfully");
});

