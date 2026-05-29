module.exports = (sequelize, DataTypes) => {
   const Movie = sequelize.define('Movie', {
     id: {
       type: DataTypes.UUID,
       defaultValue: DataTypes.UUIDV4,
       primaryKey: true,
     },
     title: {
       type: DataTypes.STRING,
       allowNull: false,
     },
     description: {
       type: DataTypes.TEXT,
       allowNull: true,
     },
     posterUrl: {
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
     tags: {
       type: DataTypes.JSONB,
       allowNull: true,
       defaultValue: [],
     },
     providerId: {
       type: DataTypes.UUID,
       allowNull: true,
     },
   });
   return Movie;
 };
