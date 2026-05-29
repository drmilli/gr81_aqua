module.exports = (sequelize, DataTypes) => {
  const Recording = sequelize.define(
    'Recording',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      deviceId: { type: DataTypes.STRING, allowNull: false, index: true },
      title: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
      streamUrl: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.ENUM('recording', 'finished', 'failed', 'stopped'), allowNull: false, defaultValue: 'recording' },
      format: { type: DataTypes.STRING, allowNull: false, defaultValue: 'ts' },
      fileName: { type: DataTypes.STRING, allowNull: false },
      filePath: { type: DataTypes.TEXT, allowNull: false },
      pid: { type: DataTypes.INTEGER, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      endedAt: { type: DataTypes.DATE, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'Recordings' }
  );

  return Recording;
};

