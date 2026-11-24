import { DataTypes, Model, Optional } from 'sequelize';
import { Database } from '../config/database';

export type Role = 'user' | 'admin';

interface UserAttributes {
  id: number;
  email: string;
  role: Role;
  credit: number; // token residui
}
type UserCreation = Optional<UserAttributes, 'id'>;

// Tabella "users": utenti con ruolo e credito (token) residuo
export class User extends Model<UserAttributes, UserCreation> implements UserAttributes {
  declare id: number;
  declare email: string;
  declare role: Role;
  declare credit: number;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    role: { type: DataTypes.ENUM('user', 'admin'), allowNull: false, defaultValue: 'user' },
    // DECIMAL in Postgres torna come stringa: con il getter lo converto in numero
    credit: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
      get() {
        return Number(this.getDataValue('credit'));
      },
    },
  },
  { sequelize: Database.getInstance(), tableName: 'users' }
);
