const express = require('express');
const app = express();
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser")
const path = require("path")
var csrf = require("tiny-csrf")

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt")

const saltRounds = 10

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser("shh! some secret string"))
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]))

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
  User.findOne({ where: { email: username }})
    .then(async (user) => {
      const result = await bcrypt.compare(password, user.password)
      if (result) {
        return done(null, user);
      } else {
        return done(null, false, { message: "Invalid password" })
      }
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

const { User, Course, Chapter, Page, Enrollment } = require("./models");
const { connected } = require('process');
const enrollment = require('./models/enrollment');
const { where } = require('sequelize');

app.set("views", path.join(__dirname, "views"))

app.get("/", (req, res) => {
    res.render("index", {
        title: "Home Page",
    });
});

app.get("/signup", (req,res) => {
    res.render("signup", {
        title: "Sign Up",
        csrfToken: req.csrfToken(),
    })
})

app.get("/login", (req,res) => {
  res.render("login", {
      title: "LogIn",
      csrfToken: req.csrfToken(),
  })
})

app.post("/users", async (req, res) => {
  // const hashedPwd = await bcrypt.hash("Virat@18", saltRounds)
  const hashedPwd = await bcrypt.hash(req.body.password, saltRounds)
  // console.log(hashedPwd)
  // console.log(req.body)
  // console.log(req.body.firstName)
  // console.log(req.body.email)
  // console.log(req.body.email)
  // console.log(req.body.password)
  try {
    const user = await User.create({
      // firstName: "Virat",
      // lastName: "Kohli",
      // email: "virat@kohli.com",
      // password: hashedPwd,
      // isEducator: true
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashedPwd
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

app.post("/session", passport.authenticate('local', { failureRedirect: "/login" }), (req,res) => {
  //console.log(req.user)
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
  const allCourses = await Course.allCourses()
  try{
    if(isEducator){
      res.render("home", {
        title: "LMS Application",
        allCourses,
        isEducator,
      })
    } else{
      const studentCourses = await Enrollment.coursesBystudentId({
        studentId: loggedInUser
      })
      const enrolledCourses = []
      let progress = []
      for(var i=0; i<studentCourses.length; i++) {
        let x = studentCourses[i].completedPages.length
        const courses = await Course.courseById(studentCourses[i].courseId)
        const course = courses[0]
        let y = course.pageCount
        console.log((x/y)*100)
        progress.push((x/y)*100)
        enrolledCourses.push(course)
      }
      // console.log(enrolledCourses.length)
      // console.log("Enrolled courses: ",enrolledCourses)
      const filteredCourses = allCourses.filter(course => {
        return !enrolledCourses.some(enrolledCourse => enrolledCourse.id === course.id);
      })
      res.render("home", {
        title: "LMS Application",
        allCourses: filteredCourses,
        enrolledCourses,
        progress,
        isEducator,
        csrfToken: req.csrfToken(),
      })
    }
  } catch(err) {
    console.log("Failed to render home page",err)
    res.send("Failed to render home page")
  }  
})

app.get("/newCourse", async (req,res) => {
  //const loggedInUser = req.user.id
  //const isEducator = req.user.isEducator
  if(req.user.isEducator){
    res.render("newCourse", {
      title: "New Course",
      csrfToken: req.csrfToken(),
    })
  } else {
    console.log("Your are not a authorized user to create the Course")
    res.status(500).send("Your are not a authorized user to create the Course");
  }
})

app.post("/newCourse", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  //console.log(req.body)
  const loggedInUser = req.user.id
  try{
    if(req.user.isEducator) {
      await Course.addCourse({
        courseName: req.body.courseName,
        courseDescription: req.body.description,
        educatorId: loggedInUser
      })
      //console.log(Course.allCourses())
      return res.redirect("/home")
    }
  } catch(err) {
    console.log(err)
    return res.status(422).json(err)
  }
})

app.get("/course/:courseId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const courseId = req.params.courseId
  const courses = await Course.courseById(courseId)
  const course = courses[0]
  const loggedInUser = req.user.id
  const isEducator = req.user.isEducator
  const allChapters = await Chapter.allChapters(courseId)
  const coursesEnrolled = await Enrollment.courseEnrolled({
    studentId: loggedInUser,
    courseId: courseId
  })
  const courseEnrolled = coursesEnrolled[0]
  let isCourseCompleted = false
  if(courseEnrolled) {
    isCourseCompleted = courseEnrolled.completed
  }
  console.log("Course Completion status: ",isCourseCompleted)
  try { 
    res.render("course", {
      title: "LMS Application",
      course,
      isEducator,
      allChapters,
      courseEnrolled,
      isCourseCompleted,
      csrfToken: req.csrfToken(),
    })
  } catch(err) {
    console.error("Error fetching course:", err);
    res.status(500).send("Error fetching course");
  } 
})

app.get("/updateCourse/:courseId/edit", async (req,res) => {
  const courseId = req.params.courseId
  try{
    const courses = await Course.courseById(courseId)
    const course = courses[0]
    //const loggedInUser = req.user.id
    //const isEducator = req.user.isEducator
    if(req.user.isEducator) {
      res.render("updateCourse", {
        title: "Update Course",
        course,
        csrfToken: req.csrfToken(),
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
    if(req.user.isEducator) {
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
    } else {
      res.status(500).send("Not an authorized user to update Course")
    }
  } catch(err) {
    console.log("Error editing course: ",err)
    res.status(500).send("Error editing course")
  }
})

app.post("/course/:courseId/delete", async (req, res) => {
  const courseId = req.params.courseId;
  const loggedInUser = req.user.id
  try {
    if(req.user.isEducator){
      console.log("Course id:",courseId)
      const enrollments = await Enrollment.enrollmentBycourseId({
        courseId
      })
      console.log("Enrollments: " ,enrollments)
      if(enrollments) {
        for(var i=0; i<enrollments.length; i++) {
          await Enrollment.deleteEnrollment({courseId})
        }
      }
      console.log("Done")
      const myChapters = await Chapter.allChapters(courseId)
      const coursePages = await Page.coursePages(courseId)
      console.log("My Courses: " ,myChapters)
      console.log("Course pages: " ,coursePages)
      if( myChapters || coursePages){
        for(var i=0; i<coursePages.length; i++){
          const pageId = coursePages[i].id
          await Page.deletePage({
            id: pageId
          })
        }
        for(var i=0; i<myChapters.length; i++) {
          const chapterId = myChapters[i].id
          await Chapter.deleteChapter({
            id: chapterId,
            courseId: courseId
          })
        }
      }
      console.log("Second time: ",courseId)
      await Course.deleteCourse({
          id: courseId,
          educatorId: loggedInUser
      });
      res.redirect("/home");
    } else{
      console.log("Not an authorized user to delete the course")
      res.status(500).send("Error deleting course");
    }
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).send("Error deleting course");
  }
});

app.get("/chapter/:chapterId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const chapterId = req.params.chapterId
  const chapters = await Chapter.chapterById(chapterId)
  const chapter = chapters[0]
  const courses = await Course.courseById(chapter.courseId)
  const course = courses[0]
  const loggedInUser = req.user.id
  const isEducator = req.user.isEducator
  const allPages = await Page.chapterPages(chapterId)
  const coursesEnrolled = await Enrollment.courseEnrolled({
    studentId: loggedInUser,
    courseId: course.id
  })
  const courseEnrolled = coursesEnrolled[0]
  let isChapterCompleted = false
  try{
    if(courseEnrolled) {
      const completedChapters = courseEnrolled.completedChapters
      console.log("Hey there 1 ",completedChapters)
      console.log("Chapter id: ", chapterId)
      for(var i=0; i<completedChapters.length; i++) {
        if(completedChapters[i] == chapterId){
          isChapterCompleted = true
        }
      }
    }
    // console.log("Completed chapter: ", completedChapters)
    // console.log("Chapter Completion status: ",isChapterCompleted)
    res.render("chapter", {
      title: "LMS Application",
        chapter,
        course,
        allPages,
        isEducator,
        courseEnrolled,
        isChapterCompleted,
        csrfToken: req.csrfToken(),
      }) 
  } catch(err) {
    console.error("Error fetching course:", err);
    console.log(err)
    res.status(500).send("Error fetching course");
  }
})

app.get("/chapter/:courseId/newChapter", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const courseId = req.params.courseId
  //console.log("Course Id: ",courseId)
  const courses = await Course.courseById(courseId)
  const course = courses[0]
  const isEducator = req.user.isEducator
  if(isEducator) {
    res.render("newChapter", {
      title: "New Chapter",
      course,
      csrfToken: req.csrfToken(),
    })
  } else {
    res.status(500).send("Not an authorized person to Create a Chapter")
  }
  
})

app.post("/chapter/:courseId/newChapter", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const courseId = req.params.courseId
  //console.log("Course Id: ",courseId)
  const courses = await Course.courseById(courseId)
  const course = courses[0]
  // console.log(course)
  const chapterCount_initial = course.chapterCount
  const chapterCount_final = chapterCount_initial + 1
  // console.log("Initial chapter count: ",chapterCount_initial)
  // console.log("Final chapter count: ",chapterCount_final)  
  const chapterName = req.body.chapterName
  const chapterDescription = req.body.chapterDescription
  //const loggedInUser = req.user.id
  const isEducator = req.user.isEducator
  try{    
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
  const chapters = await Chapter.chapterById(chapterId)
  const chapter = chapters[0]
  const courses = await Course.courseById(chapter.courseId)
  const course = await courses[0]
  // const loggedInUser = req.user.id
  // const isEducator = req.user.isEducator
  try{  
    if(req.user.isEducator) {
      res.render("updateChapter", {
        title: "Update Chapter",
        chapter,
        course,
        csrfToken: req.csrfToken(),
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

app.post("/updateChapter/:chapterId/edit", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const chapterId = req.params.chapterId
  //const isEducator = req.user.isEducator
  const chapterName = req.body.chapterName
  const chapterDescription = req.body.chapterDescription
  try{
    if(req.user.isEducator){
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
    } else{
      console.log("Not an authorized person to update the chapter")
      res.status(500).send("Error updating chapter")
    }
  } catch(err) {
    console.log("Error editing chapter: ",err)
    res.status(500).send("Error updating chapter")
  }
})

app.post("/chapter/:chapterId/delete", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const chapterId = req.params.chapterId;
  const chapters = await Chapter.chapterById(chapterId)
  const chapter  = chapters[0]
  //const isEducator = req.user.isEducator
  const courses = await Course.courseById(chapter.courseId)
  const course = courses[0]
  courseId = course.id
  const enrollments = await Enrollment.enrollmentBycourseId({
    courseId
  })
  const chapterCount_initial = course.chapterCount
  const chapterCount_final = chapterCount_initial - 1
  try {
    if(req.user.isEducator){
      const chapterPages = await Page.chapterPages(chapterId)
      if(chapterPages) {
        for(var i=0; i<chapterPages.length; i++) {
          const pageId = chapterPages[i].id    
          if(enrollments) {
            for(var i=0; i<enrollments.length; i++) {
              const enrollment = enrollments[i]
              const enrollmentId = enrollment.id
              const completedPages = enrollment.completedPages
              const index = completedPages.indexOf(pageId)
              if(index !== -1) {
                completedPages.splice(index, 1)
                await Enrollment.update(
                  { completedPages },
                  { where: {
                    id: enrollmentId
                    }
                  }
                )
              }
            }
          }
          const pageCount_initial = course.pageCount
          const pageCount_final = pageCount_initial - 1
          await Page.deletePage({
            id: pageId
          })
          await Course.update({
            pageCount: pageCount_final
          },
          {
            where: {
              id: chapter.courseId
            }
          })
        }
      }
      if(enrollments) {
        for(var i=0; i<enrollments.length; i++) {
          const enrollment = enrollments[i]
          const enrollmentId = enrollment.id
          const completedChapters = enrollment.completedChapters
          const index = completedChapters.indexOf(chapterId)
          if(index !== -1) {
            completedChapters.splice(index, 1)
            await Enrollment.update(
              { completedChapters },
              { where: {
                id: enrollmentId
                }
              }
            )
          }
        }
      }
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
    } else {
      console.log("Not an authorized person to delete Chapter")
      res.status(500).send("You are not an authorized person to delete the Chapter")
    }  
  } catch (error) {
      console.error("Error deleting chapter: ", error);
      res.status(500).send("Error deleting chapter");
  }
});

app.get("/page/:pageId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const pageId = req.params.pageId
  const pages = await Page.pageById(pageId)
  const page = pages[0]
  const courses = await Course.courseById(page.courseId)
  const course = courses[0]
  const chapters = await Chapter.chapterById(page.chapterId)
  const chapter = chapters[0]
  const loggedInUser = req.user.id
  const isEducator = req.user.isEducator
  const coursesEnrolled = await Enrollment.courseEnrolled({
    studentId: loggedInUser,
    courseId: course.id
  })
  const courseEnrolled = coursesEnrolled[0]
  let isPageCompleted = false
  if(courseEnrolled) {
    const completedPages = courseEnrolled.completedPages
    console.log("Completed pages: ",completedPages)
    // console.log(pageId)
    // console.log(completedPages[0] == pageId)
    for(var i=0; i<completedPages.length; i++) {
      if(completedPages[i] == pageId) {
        isPageCompleted = true
      }
    }
  }
  console.log("Page Completion status: ",isPageCompleted)
  try{
    res.render("page", {
      title: "LMS Application",
      page,
      chapter,
      course,
      isEducator,
      courseEnrolled,
      isPageCompleted,
      csrfToken: req.csrfToken(),
    })
  } catch(err) {
    console.log("Error retrieving the page: ",err)
    res.status(500).send("Error fetching page");
  }
})

app.get("/newPage/:chapterId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const chapterId = req.params.chapterId
  const chapters = await Chapter.chapterById(chapterId)
  const chapter = chapters[0]
  const courses = await Course.courseById(chapter.courseId)
  const course = courses[0]
  //const isEducator = req.user.isEducator
  if(req.user.isEducator){
    res.render("newPage", {
      title: "LMS Application",
      chapter,
      course,
      csrfToken: req.csrfToken(),
    })
  } else {
    res.status(500).send("You are not an authorized user to create a Page")
  }
})

app.post("/newPage/:chapterId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const chapterId = req.params.chapterId
  const chapters = await Chapter.chapterById(chapterId)
  const chapter = chapters[0]
  const courses = await Course.courseById(chapter.courseId)
  const course = courses[0]
  const pageCount_initial = course.pageCount
  const pageCount_final = pageCount_initial + 1
  //const isEducator = req.user.isEducator
  const pageName = req.body.pageName
  const pageContent = req.body.pageContent
  try{   
    if(req.user.isEducator) {
      await Page.addPage({
        pageName: pageName,
        pageContent: pageContent,
        chapterId: chapterId,
        courseId: course.id
      })
      await Course.update({
        pageCount: pageCount_final,
      },
        {
          where: {
            id: course.id
          }
        }
      )
      res.redirect(`/chapter/${chapterId}`)
    } else {
      console.log("ou are not an authorized user to create a Page")
      res.send(500).send("You are not an authorized user to create a Page")
    }
  } catch(err) {
      console.error("Error creating Page: ", err);
      res.send(500).send("You are not an authorized user to create a Page")
  }
})

app.get("/updatePage/:pageId/edit", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const pageId = req.params.pageId
  const pages = await Page.pageById(pageId)
  const page = pages[0]
  const courses = await Course.courseById(page.courseId)
  const course = courses[0]
  const chapters = await Chapter.chapterById(page.chapterId)
  const chapter = chapters[0]
  //const isEducator = req.user.isEducator
  try{
    if(req.user.isEducator){
      res.render("updatePage", {
        title: "Update Page",
        page,
        chapter,
        course,
        csrfToken: req.csrfToken(),
      })
    } else{
      console.log("Your are not a authorized user to update the Page")
      res.status(500).send("Error updating page");
    }
  } catch(err) {
    console.log("Error retrieving the page: ",err)
    res.status(500).send("Error updating page");
  }
})

app.post("/updatePage/:pageId/edit", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const pageId = req.params.pageId
  //const isEducator = req.user.isEducator
  const pageName = req.body.pageName
  const pageContent = req.body.pageContent
  try{
    if(req.user.isEducator){
      const existingPage = await Page.findOne({ where: { pageName } });
      if (existingPage) {
          return res.status(400).send("Page name already exists. Please choose a different name.");
      }
      await Page.update({
        pageName,
        pageContent
      },
        {
          where: {
            id: pageId
          }
        }
      )
      res.redirect(`/page/${pageId}`)
    } else{
      console.log("Not an authorized person to update the chapter")
      res.status(500).send("Error updating chapter")
    }
  } catch(err) {
    console.log("Error editing chapter: ",err)
    res.status(500).send("Error updating chapter")
  }
})

app.post("/page/:pageId/delete", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const pageId = req.params.pageId
  const pages = await Page.pageById(pageId)
  const page = pages[0]
  const courses = await Course.courseById(page.courseId)
  const course = courses[0]
  const pageCount_initial = course.pageCount
  const pageCount_final = pageCount_initial - 1
  try{
    if(req.user.isEducator){
      await Page.deletePage({
        id: pageId,
      })
      await Course.update({
        pageCount: pageCount_final
      },
      {
        where: {
          id: page.courseId
        }
      })
      const courseId = page.courseId
      const enrollments = await Enrollment.enrollmentBycourseId({
        courseId
      })
      if(enrollments) {
        for(var i=0; i<enrollments.length; i++) {
          const enrollment = enrollments[i]
          const enrollmentId = enrollment.id
          const completedPages = enrollment.completedPages
          const index = completedPages.indexOf(pageId)
          if(index !== -1) {
            completedPages.splice(index, 1)
            await Enrollment.update(
              { completedPages },
              { where: {
                id: enrollmentId
                }
              }
            )
          }
        }
      }
      res.redirect(`/chapter/${page.chapterId}`)
    } else {
      console.log("Not an authorized user to delete the page")
      res.status(500).send("Error deleting page");
    }
  }catch(err) {
    console.error("Error deleting chapter: ", err);
    res.status(500).send("Error deleting page");
  }
})

app.post("/enroll/:courseId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const courseId = req.params.courseId
  const loggedInUser = req.user.id
  try{
    await Enrollment.enrollCourse({
      studentId: loggedInUser,
      courseId: courseId
    })
    res.redirect(`/course/${courseId}`)
  } catch(err) {
    console.log("Error enrolling to the course: ", err)
    res.send("Error enrolling to the course")
  }
})

app.post("/markPageAsComplete/:pageId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const pageId = req.params.pageId
  const pages = await Page.pageById(pageId)
  const page = pages[0]
  const chapterPages = await Page.chapterPages(page.chapterId)
  // console.log("Chapter pages: ", chapterPages)
  // console.log("Lenght: ",chapterPages.length)
  const courses = await Course.courseById(page.courseId)
  const course = courses[0]
  // console.log(course)
  const chapterCount = course.chapterCount
  const loggedInUser = req.user.id
  let coursesEnrolled = await Enrollment.courseEnrolled({
    studentId: loggedInUser,
    courseId: page.courseId
  })
  const courseEnrolled = coursesEnrolled[0]
  try{
    if(courseEnrolled){
      let completedPages = courseEnrolled.completedPages
      let proceed1 = true
      for(var i=0; i<completedPages; i++) {
        if(completedPages[i] == pageId){
          proceed1 = false
        }
      }
      if (proceed1) {
          completedPages.push(pageId);
          //console.log("Hey there: ", completedPages)
          await Enrollment.update({
            completedPages: completedPages
          },
          {
            where: {
              studentId: loggedInUser,
              courseId: page.courseId
            }
          });   
          coursesEnrolled = await Enrollment.courseEnrolled({
            studentId: loggedInUser,
            courseId: page.courseId
          })
          // console.log("Hey there 2:", courseEnrolled.completedPages || [])
          // console.log("Completed pages: ",completedPages, completedPages.length)
          // console.log("Chapter pages: ",chapterPages)
          // console.log("Chapter pages: ",chapterPages.length)
          // console.log("Completed Pages: ",completedPages.length)
          completedPages = courseEnrolled.completedPages
          let completedChapters = courseEnrolled.completedChapters
          console.log("Hey there 2: ", completedChapters)
          let proceed2 = []
          for(var i=0; i<chapterPages.length; i++) {
            let x = chapterPages[i].id
            for(var j=0; j<completedPages.length; j++){
              if(completedPages[j] == x){
                proceed2.push(x)
              }
            }
          }
          //proceed2 = chapterPages.filter(x => !completedPages.includes(x.id))
          console.log("Proceed 2: ", proceed2)
          if(proceed2.length == chapterPages.length) {
            let proceed3 = true
            for(var i=0; i<completedChapters.length; i++) {
              if(completedChapters[i] == page.chapterId) {
                proceed3 = false
              }
            }
            console.log("Proceed 3: ", proceed3)
            console.log("Hey there 3: ", completedChapters)
            if(proceed3) {
              completedChapters.push(page.chapterId)
              await Enrollment.update({
                completedChapters
              },
              {
                where: {
                  studentId: loggedInUser,
                  courseId: page.courseId
                }
              })
              coursesEnrolled = await Enrollment.courseEnrolled({
                studentId: loggedInUser,
                courseId: page.courseId
              })
              completedChapters = courseEnrolled.completedChapters
              console.log("Hey there 4: ", completedChapters)
              if(completedChapters.length == chapterCount) {
                await Enrollment.update({
                  completed: true
                },
                {where: {
                    studentId: loggedInUser,
                    courseId: page.courseId
                }})
              }
            }
          }
          res.redirect(`/page/${pageId}`);
      } else {
        res.redirect(`/page/${pageId}`)
      }
    } else {
      console.log("Failed to mark page as complete")
      res.send("Enroll to the course to view the")
    }
  } catch(err) {
    console.log("Failed to mark the page as complete: ", err)
    res.send(err)
  }
})

app.post("/nextPage/:pageId", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const pageId = req.params.pageId
  const loggedInUser = req.user.id
  const pages = await Page.pageById(pageId)
  const page = pages[0]
  const chapterPages = await Page.chapterPages(page.chapterId)
  const coursesEnrolled = await Enrollment.courseEnrolled({
    studentId: loggedInUser,
    courseId: page.courseId
  })
  try{
    if(coursesEnrolled) {
      for(var i=0; i<=(chapterPages.length - 1); i++) {
        if(chapterPages[i].id == pageId){
          // let nextPageId = chapterPages[i+1].id
          // console.log("Next page id: ",nextPageId)
          if(chapterPages[i+1]){
            let nextPageId = chapterPages[i+1].id
            res.redirect(`/page/${nextPageId}`)
          } else {
            res.redirect(`/course/${page.courseId}`)
          }
        }
      }
    }else {
      console.log("Failed to mark page as complete")
      res.send("Enroll to the course to view the")
    }
  } catch(err) {
    console.log("Failed to fetch the next page: ",err)
    res.send(err)
  }
})

app.get("/reports", connectEnsureLogin.ensureLoggedIn(), async (req,res) => {
  const loggedInUser = req.user.id
  const isEducator = req.user.isEducator
  if(isEducator) {
    const myCourses = await Course.myCourses(loggedInUser) || []
    let enrollmentOfCourses = []
    if(myCourses){
      for(var i=0; i<myCourses.length; i++) {
        courseId = myCourses[i].id
        const enrollments = await Enrollment.enrollmentBycourseId({
          courseId
        })
        enrollmentOfCourses.push(enrollments.length)
      }
    }
    console.log("My courses: ",myCourses)
    console.log("Enrollments: ",enrollmentOfCourses)
    res.render("reports", {
      title: "Enrollment Reports", 
      myCourses,
      enrollmentOfCourses
    })    
  } else {
    console.log("Doesn't have access to view reports")
    res.status(500).send("Not an authorized user to access Reports")
  }
})

module.exports = app