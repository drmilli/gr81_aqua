module.exports = (sequelize, DataTypes) => {
   const User = sequelize.define('User', {
     id: {
       type: DataTypes.UUID,
       defaultValue: DataTypes.UUIDV4,
       primaryKey: true,
     },
     email: {
       type: DataTypes.STRING,
       allowNull: false,
       unique: true,
       validate: { isEmail: true },
     },
     passwordHash: {
       type: DataTypes.STRING,
       allowNull: false,
     },
     name: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     providerId: {
       type: DataTypes.STRING,
       allowNull: true,
       comment: 'Provider code/id if applicable',
     },
     role: {
       type: DataTypes.ENUM('user', 'admin', 'provider_admin'),
       defaultValue: 'user',
     },
   });
   return User;
 };
