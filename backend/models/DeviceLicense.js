module.exports = (sequelize, DataTypes) => {
  const DeviceLicense = sequelize.define('DeviceLicense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firstSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    trialEndsAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    plan: {
      type: DataTypes.ENUM('trial', 'yearly', 'lifetime'),
      allowNull: false,
      defaultValue: 'trial',
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'revoked'),
      allowNull: false,
      defaultValue: 'active',
    },
    paidUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastCheckedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
  return DeviceLicense;
};
