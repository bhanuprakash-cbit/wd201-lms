'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Enrollment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static enrollCourse({ studentId, courseId }) {
      return this.create({ studentId: studentId, courseId: courseId })
    }

    static coursesBystudentId({ studentId }) {
      return this.findAll({
        where: {
          studentId: studentId
        }
      })
    }

    static courseEnrolled({ studentId, courseId }) {
      return this.findAll({
        studentId: studentId,
        courseId: courseId
      })
    }
  }
  Enrollment.init({
    studentId: DataTypes.INTEGER,
    courseId: DataTypes.INTEGER,
    completed: DataTypes.BOOLEAN,
    completedChapters: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: []
    },
    comepltedPages: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'Enrollment',
  });
  return Enrollment;
};