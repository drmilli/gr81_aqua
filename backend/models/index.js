const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Import model definers
const defineUser = require('./User');
const defineProfile = require('./Profile');
const defineMovie = require('./Movie');
const defineSeries = require('./Series');
const defineTVChannel = require('./TVChannel');
const defineQRSession = require('./QRSession');
const defineProvider = require('./Provider');
const defineEPGEvent = require('./EPGEvent');
const defineSubscription = require('./Subscription');
const defineDeviceLicense = require('./DeviceLicense');
const defineRecording = require('./Recording');

// Optional models we add for MVP completeness
let defineEpisode;
let defineMyList;
try { defineEpisode = require('./Episode'); } catch (_) {}
try { defineMyList = require('./MyList'); } catch (_) {}

// Initialize models
const User = defineUser(sequelize, DataTypes);
const Profile = defineProfile(sequelize, DataTypes);
const Movie = defineMovie(sequelize, DataTypes);
const Series = defineSeries(sequelize, DataTypes);
const TVChannel = defineTVChannel(sequelize, DataTypes);
const QRSession = defineQRSession(sequelize, DataTypes);
const Provider = defineProvider(sequelize, DataTypes);
const EPGEvent = defineEPGEvent(sequelize, DataTypes);
const Subscription = defineSubscription(sequelize, DataTypes);
const DeviceLicense = defineDeviceLicense(sequelize, DataTypes);
const Recording = defineRecording(sequelize, DataTypes);
const Episode = defineEpisode ? defineEpisode(sequelize, DataTypes) : null;
const MyList = defineMyList ? defineMyList(sequelize, DataTypes) : null;

// Associations
User.hasMany(Profile, { foreignKey: 'userId', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'userId' });

if (Episode) {
  Series.hasMany(Episode, { foreignKey: 'seriesId', onDelete: 'CASCADE' });
  Episode.belongsTo(Series, { foreignKey: 'seriesId' });
}

if (MyList) {
  User.hasMany(MyList, { foreignKey: 'userId', onDelete: 'CASCADE' });
  MyList.belongsTo(User, { foreignKey: 'userId' });
}

// Provider scoping
Provider.hasMany(Movie, { foreignKey: 'providerId' });
Movie.belongsTo(Provider, { foreignKey: 'providerId' });
Provider.hasMany(Series, { foreignKey: 'providerId' });
Series.belongsTo(Provider, { foreignKey: 'providerId' });
Provider.hasMany(TVChannel, { foreignKey: 'providerId' });
TVChannel.belongsTo(Provider, { foreignKey: 'providerId' });

// EPG associations
TVChannel.hasMany(EPGEvent, { foreignKey: 'channelId', onDelete: 'CASCADE' });
EPGEvent.belongsTo(TVChannel, { foreignKey: 'channelId' });

// Subscriptions
User.hasMany(Subscription, { foreignKey: 'userId', onDelete: 'CASCADE' });
Subscription.belongsTo(User, { foreignKey: 'userId' });
Provider.hasMany(Subscription, { foreignKey: 'providerId' });
Subscription.belongsTo(Provider, { foreignKey: 'providerId' });

module.exports = {
  sequelize,
  User,
  Profile,
  Movie,
  Series,
  Episode,
  TVChannel,
  QRSession,
  MyList,
  Provider,
  EPGEvent,
  Subscription,
  DeviceLicense,
  Recording,
};
