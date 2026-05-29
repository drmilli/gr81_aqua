module.exports = (sequelize, DataTypes) => {
  const MyList = sequelize.define('MyList', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    itemType: {
      type: DataTypes.ENUM('movie', 'series'),
      allowNull: false,
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  });
  return MyList;
};
