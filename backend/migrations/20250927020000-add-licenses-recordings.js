"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, INTEGER, DATE, ENUM, BOOLEAN } = Sequelize;

    // DeviceLicenses
    await queryInterface.createTable("DeviceLicenses", {
      id:            { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      deviceId:      { type: STRING, allowNull: false, unique: true },
      platform:      { type: STRING, allowNull: true },
      firstSeenAt:   { type: DATE, allowNull: false },
      trialEndsAt:   { type: DATE, allowNull: false },
      plan:          { type: ENUM("trial", "yearly", "lifetime"), allowNull: false, defaultValue: "trial" },
      status:        { type: ENUM("active", "expired", "revoked"), allowNull: false, defaultValue: "active" },
      paidUntil:     { type: DATE, allowNull: true },
      lastCheckedAt: { type: DATE, allowNull: true },
      createdAt:     { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt:     { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Recordings
    await queryInterface.createTable("Recordings", {
      id:        { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      deviceId:  { type: STRING, allowNull: false },
      title:     { type: STRING, allowNull: false, defaultValue: "" },
      streamUrl: { type: TEXT, allowNull: false },
      status:    { type: ENUM("recording", "finished", "failed", "stopped"), allowNull: false, defaultValue: "recording" },
      format:    { type: STRING, allowNull: false, defaultValue: "ts" },
      fileName:  { type: STRING, allowNull: false },
      filePath:  { type: TEXT, allowNull: false },
      pid:       { type: INTEGER, allowNull: true },
      startedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      endedAt:   { type: DATE, allowNull: true },
      error:     { type: TEXT, allowNull: true },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // portals table (raw SQL — not managed by Sequelize model but needed by portalsDb.js)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS portals (
        id           SERIAL PRIMARY KEY,
        name         TEXT,
        base_url     TEXT NOT NULL UNIQUE,
        primary_flag BOOLEAN DEFAULT FALSE,
        created_at   TIMESTAMP DEFAULT now()
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Recordings");
    await queryInterface.dropTable("DeviceLicenses");
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS portals;`);
  },
};
