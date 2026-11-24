import { User } from './User';
import { GridModel } from './GridModel';
import { GridUpdate } from './GridUpdate';

// Relazioni tra le tabelle
User.hasMany(GridModel, { foreignKey: 'ownerId', as: 'models' });
GridModel.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

GridModel.hasMany(GridUpdate, { foreignKey: 'modelId', as: 'updates' });
GridUpdate.belongsTo(GridModel, { foreignKey: 'modelId', as: 'model' });

User.hasMany(GridUpdate, { foreignKey: 'requesterId', as: 'requests' });
GridUpdate.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });

export { User, GridModel, GridUpdate };
