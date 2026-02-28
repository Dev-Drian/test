/**
 * Script para limpiar duplicados en todas las DBs
 */
const http = require('http');

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: 5984,
      path,
      method,
      auth: 'admin:password',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function cleanDuplicates(dbName, keyField = 'name') {
  console.log(`\n🔍 Checking ${dbName}...`);
  
  const result = await request('GET', `/${dbName}/_all_docs?include_docs=true`);
  
  if (result.error) {
    console.log(`   ⚠️ DB not found: ${dbName}`);
    return 0;
  }
  
  const docs = result.rows.filter(r => r.doc && !r.id.startsWith('_') && r.doc[keyField]);
  console.log(`   Total docs: ${docs.length}`);
  
  // Group by key
  const byKey = {};
  docs.forEach(r => {
    const key = r.doc[keyField];
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(r.doc);
  });
  
  // Find duplicates
  const toDelete = [];
  Object.entries(byKey).forEach(([key, items]) => {
    if (items.length > 1) {
      console.log(`   📋 "${key}": ${items.length} (keeping 1, deleting ${items.length - 1})`);
      items.slice(1).forEach(doc => {
        toDelete.push({ _id: doc._id, _rev: doc._rev, _deleted: true });
      });
    }
  });
  
  if (toDelete.length === 0) {
    console.log(`   ✅ No duplicates`);
    return 0;
  }
  
  // Delete duplicates
  const deleteResult = await request('POST', `/${dbName}/_bulk_docs`, { docs: toDelete });
  console.log(`   🗑️ Deleted ${toDelete.length} duplicates`);
  
  return toDelete.length;
}

async function main() {
  console.log('🧹 CLEANUP DUPLICATES\n');
  
  // Get all DBs
  const dbs = await request('GET', '/_all_dbs');
  
  let totalDeleted = 0;
  
  // Clean agents
  const agentDbs = dbs.filter(db => db.startsWith('chatbot_agents_'));
  for (const db of agentDbs) {
    totalDeleted += await cleanDuplicates(db, 'name');
  }
  
  // Clean tables
  const tableDbs = dbs.filter(db => db.startsWith('chatbot_tables_'));
  for (const db of tableDbs) {
    totalDeleted += await cleanDuplicates(db, 'name');
  }
  
  // Clean flows
  const flowDbs = dbs.filter(db => db.startsWith('chatbot_flows_'));
  for (const db of flowDbs) {
    totalDeleted += await cleanDuplicates(db, 'name');
  }
  
  console.log(`\n✨ Done! Deleted ${totalDeleted} total duplicates`);
}

main().catch(console.error);
