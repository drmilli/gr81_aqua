module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    providerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    plan: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'basic',
    },
    status: {
      type: DataTypes.ENUM('active', 'past_due', 'canceled', 'trialing'),
      defaultValue: 'trialing',
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
  return Subscription;
};
