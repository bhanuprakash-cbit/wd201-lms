'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Chapter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here

    }

    static addChapter({ chapterName, chapterDescription, courseId }) {
      return this.create({ chapterName: chapterName, chapterDescription: chapterDescription, courseId: courseId })
    } 
    
    static async deleteChapter({ id, courseId }) {
      return this.destroy({
        where: {
          id,
          courseId: courseId
        }
      })
    }

    static allChapters(courseId) {
      return this.findAll({
        where: {
          courseId: courseId,
        }
      })
    }

    static chapterById(chapterId) {
      return this.findAll({
        where: {
          id: chapterId
        }
      })
    }
    
  }
  Chapter.init({
    chapterName: DataTypes.STRING,
    chapterDescription: DataTypes.TEXT,
    courseId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Chapter',
  });
  return Chapter;
};