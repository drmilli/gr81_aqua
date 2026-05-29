module.exports = (sequelize, DataTypes) => {
  const Provider = sequelize.define('Provider', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      comment: 'Unique provider code used by clients to connect',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    m3uUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    xtreamUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Xtream Codes base server URL',
    },
    xtreamUsername: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    xtreamPassword: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    xmltvUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });
  return Provider;
};
