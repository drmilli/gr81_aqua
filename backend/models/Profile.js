module.exports = (sequelize, DataTypes) => {
   const Profile = sequelize.define('Profile', {
     id: {
       type: DataTypes.UUID,
       defaultValue: DataTypes.UUIDV4,
       primaryKey: true,
     },
     name: {
       type: DataTypes.STRING,
       allowNull: false,
       defaultValue: 'Profile',
     },
     avatar: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     userId: {
       type: DataTypes.UUID,
       allowNull: false,
     },
   });
   return Profile;
 };
