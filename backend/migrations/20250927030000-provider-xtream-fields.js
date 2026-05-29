"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Providers", "xtreamUrl",      { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn("Providers", "xtreamUsername", { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn("Providers", "xtreamPassword", { type: Sequelize.STRING, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("Providers", "xtreamUrl");
    await queryInterface.removeColumn("Providers", "xtreamUsername");
    await queryInterface.removeColumn("Providers", "xtreamPassword");
  },
};
