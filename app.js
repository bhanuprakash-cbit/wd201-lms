const express = require('express');
const app = express();
const path = require("path")

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "views"))

app.get("/", (req, res) => {
    res.render("index", {
        title: "Home Page"
    });
});

app.get("/signup", (req,res) => {
    res.render("signup", {
        title: "Sign Up"
    })
})

app.get("/signin", (req,res) => {
    res.render("signin", {
        title: "SingIn"
    })
})

app.get("/signout", (req,res,next) => {
    req.logout((err) => {
      if (err) { return next(err) }
      res.redirect("/")
    })
})

app.get("/home", (req,res) => {
    res.render("home")
})

app.get("/course", (req,res) => {
res.render("course", {
    chapters: "Chapter 1"
})
})

app.get("/reports", (req,res) => {
res.render("reports")
})

app.get("/newCourse", (req,res) => {
res.render("newCourse")
})

app.get("/newCourse", (req,res) => {
    res.render("newCourse")
})

module.exports = app