import { DataTypes, Model, Optional } from 'sequelize';
import { Database } from '../config/database';

export type UpdateStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

interface GridUpdateAttributes {
  id: number;
  modelId: number;
  requesterId: number;
  x: number; // colonna
  y: number; // riga
  newValue: number; // 0 oppure 1
  status: UpdateStatus;
  cost: number; // token pagati per questa cella
  appliedVersion: number | null; // versione del modello creata da questo aggiornamento
  resolvedAt: Date | null; // quando è stato accettato/rifiutato
  createdAt?: Date;
}
type GridUpdateCreation = Optional<GridUpdateAttributes, 'id' | 'appliedVersion' | 'resolvedAt'>;

// Tabella "grid_updates": una riga per ogni cella di cui si chiede la modifica
export class GridUpdate extends Model<GridUpdateAttributes, GridUpdateCreation> implements GridUpdateAttributes {
  declare id: number;
  declare modelId: number;
  declare requesterId: number;
  declare x: number;
  declare y: number;
  declare newValue: number;
  declare status: UpdateStatus;
  declare cost: number;
  declare appliedVersion: number | null;
  declare resolvedAt: Date | null;
  declare createdAt: Date;
}

GridUpdate.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    modelId: { type: DataTypes.INTEGER, allowNull: false },
    requesterId: { type: DataTypes.INTEGER, allowNull: false },
    x: { type: DataTypes.INTEGER, allowNull: false },
    y: { type: DataTypes.INTEGER, allowNull: false },
    newValue: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
    cost: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      get() {
        return Number(this.getDataValue('cost'));
      },
    },
    appliedVersion: { type: DataTypes.INTEGER, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize: Database.getInstance(), tableName: 'grid_updates' }
);
