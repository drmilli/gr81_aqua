module.exports = (sequelize, DataTypes) => {
   const TVChannel = sequelize.define('TVChannel', {
     id: {
       type: DataTypes.UUID,
       defaultValue: DataTypes.UUIDV4,
       primaryKey: true,
     },
     name: {
       type: DataTypes.STRING,
       allowNull: false,
     },
     logoUrl: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     hlsUrl: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     category: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     epgId: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     providerId: {
       type: DataTypes.UUID,
       allowNull: true,
     },
   });
   return TVChannel;
 };
