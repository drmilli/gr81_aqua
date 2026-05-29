module.exports = (sequelize, DataTypes) => {
   const QRSession = sequelize.define('QRSession', {
     id: {
       type: DataTypes.UUID,
       defaultValue: DataTypes.UUIDV4,
       primaryKey: true,
     },
     code: {
       type: DataTypes.STRING,
       allowNull: false,
       unique: true,
     },
     userId: {
       type: DataTypes.UUID,
       allowNull: true,
     },
     status: {
       type: DataTypes.ENUM('pending', 'verified', 'expired'),
       defaultValue: 'pending',
     },
     expiresAt: {
       type: DataTypes.DATE,
       allowNull: false,
     },
   });
   return QRSession;
 };
