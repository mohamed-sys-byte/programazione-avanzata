import { DataTypes, Model, Optional } from 'sequelize';
import { Database } from '../config/database';

export type HeuristicName = 'Manhattan' | 'Euclidean' | 'Chebyshev' | 'Octile';

interface GridModelAttributes {
  id: number;
  name: string;
  ownerId: number;
  grid: number[][]; // matrice di 0 (libero) e 1 (ostacolo)
  heuristic: HeuristicName;
  diagonalAllowed: boolean;
  includeStartNode: boolean;
  includeEndNode: boolean;
  weight: number;
  version: number; // aumenta di 1 ogni volta che la griglia viene modificata
}
type GridModelCreation = Optional<
  GridModelAttributes,
  'id' | 'heuristic' | 'diagonalAllowed' | 'includeStartNode' | 'includeEndNode' | 'weight' | 'version'
>;

// Tabella "models": un modello di ricerca del percorso su griglia
export class GridModel extends Model<GridModelAttributes, GridModelCreation> implements GridModelAttributes {
  declare id: number;
  declare name: string;
  declare ownerId: number;
  declare grid: number[][];
  declare heuristic: HeuristicName;
  declare diagonalAllowed: boolean;
  declare includeStartNode: boolean;
  declare includeEndNode: boolean;
  declare weight: number;
  declare version: number;
}

GridModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
    grid: { type: DataTypes.JSON, allowNull: false },
    heuristic: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Manhattan' },
    diagonalAllowed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    includeStartNode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    includeEndNode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  },
  { sequelize: Database.getInstance(), tableName: 'models' }
);
