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

const { User, Course, Chapter, Page } = require("./models")

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

app.get("/newCourse", async (req,res) => {
  const loggedInUser = req.user.id
  const users = await User.userById(loggedInUser)
  const user = users[0]
  const isEducator = user.isEducator
  if(isEducator){
    res.render("newCourse")
  } else {
    console.log("Your are not a authorized user to create the Course")
    res.status(500).send("Error fetching course");
  }
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
    const allChapters = await Chapter.allChapters(courseId)
    res.render("course", {
      course,
      isEducator,
      allChapters
    })
  } catch(err) {
    console.error("Error fetching course:", err);
    console.log(err)
    res.status(500).send("Error fetching course");
  }
  
})

app.post("/newCourse", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  console.log(req.body)
  const loggedInUser = req.user.id
  try{
    await Course.addCourse({
      courseName: req.body.courseName,
      courseDescription: req.body.description,
      educatorId: loggedInUser
    })
    console.log(Course.allCourses())
    return res.redirect("/home")
  } catch(err) {
    console.log(err)
    return res.status(422).json(err)
  }
})

app.get("/updateCourse/:courseId/edit", async (req,res) => {
  const courseId = req.params.courseId
  try{
    const courses = await Course.courseById(courseId)
    const course = courses[0]
    const loggedInUser = req.user.id
    const users = await User.userById(loggedInUser)
    const user = users[0]
    const isEducator = user.isEducator
    if(isEducator) {
      res.render("updateCourse", {
        course
      })
    } else {
      console.log("Your are not a authorized user to update the Course")
      res.status(500).send("Error fetching course");
    }
  } catch(err) {
    console.error("Error fetching course:", err);
    res.status(500).send("Error fetching course");
  }
})

app.post("/updateCourse/:courseId/edit", async (req,res) => {
  const courseId = req.params.courseId
  const courseName = req.body.courseName
  const courseDescription = req.body.courseDescription
  try{
    const existingCourse = await Course.findOne({ where: { courseName } });
    if (existingCourse) {
        return res.status(400).send("Course name already exists. Please choose a different name.");
    }
    await Course.update({
      courseName,
      courseDescription
    },
      {
        where: {
          id: courseId
        }
      }
    )
    res.redirect(`/course/${courseId}`)
  } catch(err) {
    console.log("Error editing course: ",err)
    res.status(500).send("Error editing course")
  }
})

app.post("/course/:courseId/delete", async (req, res) => {
  const courseId = req.params.courseId;
  const loggedInUser = req.user.id
  const myChapters = await Chapter.allChapters(courseId)
  for(var i=0; i<myChapters.length; i++) {
    const chapterId = myChapters[i].id
    await Chapter.deleteChapter({
      id: chapterId,
      courseId: courseId
    })
  }
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

app.get("/chapter/:chapterId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const chapterId = req.params.chapterId
  console.log(chapterId)
  try{
    const chapters = await Chapter.chapterById(chapterId)
    const chapter = chapters[0]
    const courses = await Course.courseById(chapter.courseId)
    const course = courses[0]
    const loggedInUser = req.user.id
    const users = await User.userById(loggedInUser)
    const user = users[0]
    const isEducator = user.isEducator
    //const allPages = await Page.allPages(chapterId)
    if(isEducator) {
      res.render("chapter", {
        chapter,
        course,
        isEducator
      })
    } else {
      console.log("Your are not a authorized user to access the chapter")
      res.status(500).send("Error fetching Chapter");
    } 
  } catch(err) {
    console.error("Error fetching course:", err);
    console.log(err)
    res.status(500).send("Error fetching course");
  }
})

app.get("/chapter/:courseId/newChapter", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const courseId = req.params.courseId
  console.log("Course Id: ",courseId)
  const courses = await Course.courseById(courseId)
  const course = courses[0]
  const loggedInUser = req.user.id
  res.render("newChapter", {
    course
  })
})

app.post("/chapter/:courseId/newChapter", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const courseId = req.params.courseId
  console.log("Course Id: ",courseId)
  const courses = await Course.courseById(courseId)
  const course = courses[0]
  // console.log(course)
  const chapterCount_initial = course.chapterCount
  const chapterCount_final = chapterCount_initial + 1
  console.log("Initial chapter count: ",chapterCount_initial)
  console.log("Final chapter count: ",chapterCount_final)  
  const chapterName = req.body.chapterName
  const chapterDescription = req.body.description
  console.log(chapterName)
  console.log(chapterDescription)
  try{
    const loggedInUser = req.user.id
    const users = await User.userById(loggedInUser)
    const user = users[0]
    const isEducator = user.isEducator
    if(isEducator) {
      await Chapter.addChapter({
        chapterName: chapterName,
        chapterDescription: chapterDescription,
        courseId: courseId
      })
      await Course.update({
        chapterCount: chapterCount_final,
      },
        {
          where: {
            id: courseId
          }
        }
      )
    }
    res.redirect(`/course/${courseId}`)
  } catch(err) {
      console.error("Error fetching course:", err);
  }
})

app.get("/updateChapter/:chapterId/edit", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const chapterId = req.params.chapterId
  try{
    const chapters = await Chapter.chapterById(chapterId)
    const chapter = chapters[0]
    const courses = await Course.courseById(chapter.courseId)
    const course = await courses[0]
    const loggedInUser = req.user.id
    const users = await User.userById(loggedInUser)
    const user = users[0]
    const isEducator = user.isEducator
    if(isEducator) {
      res.render("updateChapter", {
        chapter,
        course
      })
    } else {
      console.log("Your are not a authorized user to update the Chapter")
      res.status(500).send("Error fetching chapter");
    }
  } catch(err) {
    console.error("Error fetching chapter:", err);
    res.status(500).send("Error fetching chapter");
  }
})

app.post("/updateChapter/:chapterId/edit", async (req,res) => {
  const chapterId = req.params.chapterId
  const chapterName = req.body.chapterName
  const chapterDescription = req.body.chapterDescription
  try{
    const existingChapter = await Chapter.findOne({ where: { chapterName } });
    if (existingChapter) {
        return res.status(400).send("Chapter name already exists. Please choose a different name.");
    }
    await Chapter.update({
      chapterName,
      chapterDescription
    },
      {
        where: {
          id: chapterId
        }
      }
    )
    res.redirect(`/chapter/${chapterId}`)
  } catch(err) {
    console.log("Error editing chapter: ",err)
    res.status(500).send("Error editing chapter")
  }
})

app.post("/chapter/:chapterId/delete", async (req, res) => {
  const chapterId = req.params.chapterId;
  const chapters = await Chapter.chapterById(chapterId)
  const chapter  = chapters[0]
  const loggedInUser = req.user.id
  const courses = await Course.courseById(chapter.courseId)
  const course = courses[0]
  const chapterCount_initial = course.chapterCount
  const chapterCount_final = chapterCount_initial - 1
  console.log("Initial chapter count: ",chapterCount_initial)
  console.log("Final chapter count: ",chapterCount_final)
  //const myChapters = await Chapter.allChapters(courseId)
  // for(var i=0; i<myChapters.length; i++) {
  //   const chapterId = myChapters[i].id
  //   await Chapter.deleteChapter({
  //     id: chapterId,
  //     courseId: courseId
  //   })
  // }
  try {
      await Chapter.deleteChapter({
          id: chapterId,
          courseId: chapter.courseId
      });
      await Course.update({
        chapterCount: chapterCount_final,
      },
        {
          where: {
            id: chapter.courseId
          }
        }
      )
      res.redirect(`/course/${chapter.courseId}`);
  } catch (error) {
      console.error("Error deleting chapter: ", error);
      res.status(500).send("Error deleting chapter");
  }
});

app.get("/reports", connectEnsureLogin.ensureLoggedIn(), (req,res) => {
  res.render("reports")
})

app.get("/page", connectEnsureLogin.ensureLoggedIn(), (req,res) => {
  res.render("page")
})

app.get("/newPage", connectEnsureLogin.ensureLoggedIn(), (req,res) => {
  res.render("newPage")
})

module.exports = app