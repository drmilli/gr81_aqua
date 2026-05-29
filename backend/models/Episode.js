module.exports = (sequelize, DataTypes) => {
  const Episode = sequelize.define('Episode', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    seriesId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    season: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    episodeNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hlsUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });
  return Episode;
};
