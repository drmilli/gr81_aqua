module.exports = (sequelize, DataTypes) => {
   const Series = sequelize.define('Series', {
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
   return Series;
 };
