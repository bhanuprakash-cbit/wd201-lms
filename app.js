const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const path = require("path")

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }))

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "my-super-secret-key-21728172615261562",
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
  },
})
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
  usernameField: "email",
  passwordField: "password",
},  (username, password, done) => {
  User.findOne({ where: { email: username, password: password }})
    .then(async (user) => {
      // const result = await bcrypt.compare(password, user.password)
      // if (result) {
        return done(null, user);
      // } else {
      //   return done(null, false, { message: "Invalid password" })
      // }
    }).catch((err) => {
      return err;
    });
}));

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

const { User, Course } = require("./models")

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

app.post("/users", async (req, res) => {
  // const hashedPwd = await bcrypt.hash(req.body.password, saltRounds)
  // console.log(hashedPwd)
  console.log(req.body)
  console.log(req.body.firstName)
  console.log(req.body.email)
  console.log(req.body.email)
  console.log(req.body.password)
  try {
    const user = await User.create({
      // firstName: "Virat",
      // lastName: "Kohli",
      // email: "virat@kohli.com",
      // password: "Virat@18",
      // isEducator: true
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err)
      }
      res.redirect("/home");
    })
  } catch (err) {
    console.log(err);
  }
  });

app.get("/login", (req,res) => {
    res.render("login", {
        title: "LogIn"
    })
})

app.post("/session", passport.authenticate('local', { failureRedirect: "/login" }), (req,res) => {
  console.log(req.user)
  res.redirect("/home")
})

app.get("/signout", (req,res,next) => {
    req.logout((err) => {
      if (err) { return next(err) }
      res.redirect("/")
    })
})

app.get("/home", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const loggedInUser = req.user.id
  const isEducator = req.user.isEducator
  const myCourses = await Course.myCourses(loggedInUser)
  const allCourses = await Course.allCourses()
    res.render("home", {
      title: "LMS Application",
      myCourses,
      allCourses,
      isEducator,
    })
})

app.get("/course/:courseId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const courseId = req.params.courseId
  console.log(courseId)
  try{
    const courses = await Course.courseById(courseId)
    const course = courses[0]
    const loggedInUser = req.user.id
    const users = await User.userById(loggedInUser)
    const user = users[0]
    const isEducator = user.isEducator
    res.render("course", {
      course,
      isEducator
    })
  } catch(err) {
    console.error("Error fetching course:", err);
    console.log(err)
    res.status(500).send("Error fetching course");
  }
  
})


app.get("/newCourse", connectEnsureLogin.ensureLoggedIn(), (req,res) => {
res.render("newCourse")
})

app.post("/newCourse", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  console.log(req.body)
  const loggedInUser = req.user.id
  try{
    await Course.addCourse({
      courseName: req.body.courseName,
      courseDescription: req.body.courseDescription,
      educatorId: loggedInUser
    })
    console.log(Course.allCourses())
    return res.redirect("/home")
  } catch(err) {
    console.log(err)
    return res.status(422).json(err)
  }
})

app.get("/reports", connectEnsureLogin.ensureLoggedIn(), (req,res) => {
  res.render("reports")
})
  
app.get("/chapter", connectEnsureLogin.ensureLoggedIn(), (req,res) => {
  res.render("chapter")
})

app.get("/page", connectEnsureLogin.ensureLoggedIn(), (req,res) => {
  res.render("page")
})
  
app.get("/newChapter", connectEnsureLogin.ensureLoggedIn(), (req,res) => {
  res.render("newChapter")
})

app.get("/newPage", connectEnsureLogin.ensureLoggedIn(), (req,res) => {
  res.render("newPage")
})

app.post("/course/:courseId/delete", async (req, res) => {
  const courseId = req.params.courseId;
  const loggedInUser = req.user.id
  try {
      await Course.deleteCourse({
          id: courseId,
          educatorId: loggedInUser
      });
      res.redirect("/home");
  } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).send("Error deleting course");
  }
});


module.exports = app