const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeTai = sequelize.define('DeTai', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  ten_de_tai: {
    type: DataTypes.STRING,
    allowNull: false
  },
  so_luong_toi_da: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  so_luong_da_dang_ky: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  tableName: 'DeTai',
  timestamps: false,
  version: true // KÍCH HOẠT OPTIMISTIC LOCKING TỰ ĐỘNG
});

module.exports = DeTai;