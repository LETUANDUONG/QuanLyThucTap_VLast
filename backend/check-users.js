import { connectDb } from './config/database.js';

async function checkSchema() {
  try {
    const pool = await connectDb();
    
    console.log('📋 NguoiDung table columns:');
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'NguoiDung'
      ORDER BY ORDINAL_POSITION
    `);
    
    result.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    console.log('\n📊 Current users:');
    const users = await pool.request().query('SELECT id, ho_ten, email, vai_tro FROM NguoiDung');
    users.recordset.forEach(u => {
      console.log(`  - ${u.ho_ten} (${u.email}) - ${u.vai_tro}`);
    });

    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

checkSchema();
