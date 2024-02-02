'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Page extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      
    }

    static addPage({ pageName, pageContent, chapterId, courseId }) {
      return this.create({ pageName: pageName, pageContent: pageContent, chapterId: chapterId, courseId: courseId })
    }

    static pageById(pageId) {
      return this.findAll({
        where: {
          id: pageId
        }
      })
    }

    static coursePages(courseId) {
      return this.findAll({
        where: {
          courseId: courseId,
        }
      })
    }

    static chapterPages(chapterId) {
      return this.findAll({
        where: {
          chapterId: chapterId,
        }
      })
    }

    static async deletePage({ pageId, courseId, chapterId }) {
      return this.destroy({
        where: {
          id: pageId,
          courseId: courseId,
          chapterId: chapterId
        }
      })
    }

  }
  Page.init({
    pageName: DataTypes.STRING,
    pageContent: DataTypes.TEXT,
    chapterId: DataTypes.INTEGER,
    courseId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Page',
  });
  return Page;
};