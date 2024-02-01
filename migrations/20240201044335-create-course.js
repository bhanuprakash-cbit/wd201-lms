'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Courses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      courseName: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      courseDescription: {
        type: Sequelize.TEXT
      },
      educatorId: {
        type: Sequelize.INTEGER
      },
      chapterCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      pageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      enrollmentCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Courses');
  }
};