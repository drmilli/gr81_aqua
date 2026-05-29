"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, JSONB, DATE, ENUM, INTEGER, BOOLEAN } = Sequelize;

    // Users
    await queryInterface.createTable("Users", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      email: { type: STRING, allowNull: false, unique: true },
      passwordHash: { type: STRING, allowNull: false },
      name: { type: STRING },
      providerId: { type: STRING },
      role: { type: ENUM("user", "admin", "provider_admin"), defaultValue: "user" },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Profiles
    await queryInterface.createTable("Profiles", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      name: { type: STRING, allowNull: false },
      avatar: { type: STRING },
      userId: { type: UUID, allowNull: false },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Providers
    await queryInterface.createTable("Providers", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      code: { type: STRING, allowNull: false, unique: true },
      name: { type: STRING, allowNull: false },
      xmltvUrl: { type: STRING },
      m3uUrl: { type: STRING },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Movies
    await queryInterface.createTable("Movies", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      title: { type: STRING, allowNull: false },
      description: { type: TEXT },
      posterUrl: { type: STRING },
      hlsUrl: { type: STRING },
      category: { type: STRING },
      tags: { type: JSONB },
      providerId: { type: UUID },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Series
    await queryInterface.createTable("Series", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      title: { type: STRING, allowNull: false },
      description: { type: TEXT },
      posterUrl: { type: STRING },
      category: { type: STRING },
      tags: { type: JSONB },
      providerId: { type: UUID },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Episodes
    await queryInterface.createTable("Episodes", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      seriesId: { type: UUID, allowNull: false },
      season: { type: INTEGER },
      episodeNumber: { type: INTEGER },
      title: { type: STRING, allowNull: false },
      description: { type: TEXT },
      hlsUrl: { type: STRING },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // TVChannels
    await queryInterface.createTable("TVChannels", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      name: { type: STRING, allowNull: false },
      logoUrl: { type: STRING },
      hlsUrl: { type: STRING },
      category: { type: STRING },
      epgId: { type: STRING },
      providerId: { type: UUID },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // QRSession
    await queryInterface.createTable("QRSessions", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      code: { type: STRING, allowNull: false, unique: true },
      userId: { type: UUID },
      status: { type: ENUM("pending", "verified", "expired"), defaultValue: "pending" },
      expiresAt: { type: DATE, allowNull: false },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // EPGEvent
    await queryInterface.createTable("EPGEvents", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      channelId: { type: UUID, allowNull: false },
      title: { type: STRING, allowNull: false },
      summary: { type: TEXT },
      startsAt: { type: DATE, allowNull: false },
      endsAt: { type: DATE, allowNull: false },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // MyList
    await queryInterface.createTable("MyLists", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      userId: { type: UUID, allowNull: false },
      itemType: { type: ENUM("movie", "series"), allowNull: false },
      itemId: { type: UUID, allowNull: false },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Subscription
    await queryInterface.createTable("Subscriptions", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      userId: { type: UUID, allowNull: false },
      providerId: { type: UUID },
      plan: { type: STRING, allowNull: false, defaultValue: "basic" },
      status: { type: ENUM("active", "past_due", "canceled", "trialing"), defaultValue: "trialing" },
      currentPeriodEnd: { type: DATE },
      createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Subscriptions");
    await queryInterface.dropTable("MyLists");
    await queryInterface.dropTable("EPGEvents");
    await queryInterface.dropTable("QRSessions");
    await queryInterface.dropTable("TVChannels");
    await queryInterface.dropTable("Episodes");
    await queryInterface.dropTable("Series");
    await queryInterface.dropTable("Movies");
    await queryInterface.dropTable("Providers");
    await queryInterface.dropTable("Profiles");
    await queryInterface.dropTable("Users");
  },
};
