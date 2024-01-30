const express = require('express');
const app = express();
const path = require("path")

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "views"))

app.get("/", (req, res) => {
    res.render("index", {
        title: "LMS"
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

module.exports = app