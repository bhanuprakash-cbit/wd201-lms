'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static addCourse({ courseName, courseDescription,educatorId }) {
      return this.create({ courseName: courseName, courseDescription: courseDescription, educatorId: educatorId })
    }

    static async deleteCourse({ id, educatorId }) {
      return this.destroy({
        where: {
          id,
          educatorId: educatorId
        }
      })
    } 

    static courseById(courseId) {
      return this.findAll({
        where: {
          id: courseId
        }
      })
    }

    static myCourses(loggedInUser) {
      return this.findAll({
        where: {
          educatorId: loggedInUser,
        }
      })
    }

    static allCourses() {
      return this.findAll()
    }

    static async remove(id, loggedInUser) {
      return this.destroy({
        where: {
          id,
          educatorId: loggedInUser,
        }
      })
    }
  }
  Course.init({
    courseName: DataTypes.STRING,
    courseDescription: DataTypes.TEXT,
    educatorId: DataTypes.INTEGER,
    chapterCount: DataTypes.INTEGER,
    pageCount: DataTypes.INTEGER,
    enrollmentCount: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Course',
  });
  return Course;
};