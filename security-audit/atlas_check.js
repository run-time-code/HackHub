'use strict';

// Read-only Atlas validation for the audit.
// Never prints the connection string, password, or document contents.

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const atlasHost = process.env.ATLAS_HOST;
if (!atlasHost) {
  throw new Error('ATLAS_HOST environment variable is required (do not hardcode the Atlas hostname)');
}
const out = [];
const log = (line) => {
  out.push(line);
  console.log(line);
};

function redact(err) {
  return String((err && (err.message || err)) || '').replace(
    /mongodb(\+srv)?:\/\/[^\s]+/g,
    'mongodb://<redacted>'
  );
}

async function unauthenticatedCheck() {
  const client = new MongoClient(`mongodb://${atlasHost}:27017/HackHub?directConnection=true&tls=true`, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  try {
    await client.connect();
    await client.db('HackHub').command({ ping: 1 });
    log('UNAUTH: TCP + TLS connected and ping accepted WITHOUT credentials (Atlas allows pre-auth ping)');
    const cols = await client.db('HackHub')
      .listCollections({}, { nameOnly: true })
      .toArray();
    log(`UNAUTH: listCollections returned=${cols.length} collections (FAIL: auth not enforced)`);
    if (cols.length) {
      log(`UNAUTH: sample collection names -> ${cols.map((c) => c.name).slice(0, 6).join(',')}`);
      const n = await client.db('HackHub').collection(cols[0].name).estimatedDocumentCount();
      log(`UNAUTH: estimatedCount on ${cols[0].name}=${n} (metadata only, no documents read)`);
    }
  } catch (err) {
    log(`UNAUTH: rejected without credentials -> ${err.name} code=${err.code || 'n/a'}`);
    log(`UNAUTH: message class -> ${/Authentication failed|requires authentication|Unauthorized/i.test(redact(err)) ? 'authentication/authorization error' : 'other error'}`);
  } finally {
    await client.close().catch(() => {});
  }
}

async function authenticatedCheck() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  try {
    await client.connect();
    log('AUTH: SRV connection accepted');

    const hello = await client.db('admin').command({ hello: 1 });
    log(`AUTH: hello ok=${hello.ok} setName=${hello.setName || 'n/a'} msg=${hello.msg || 'n/a'} maxWireVersion=${hello.maxWireVersion}`);

    let status;
    try {
      status = await client.db('admin').command({ connectionStatus: 1 });
      const users = (status.authInfo && status.authInfo.authenticatedUsers) || [];
      log(`AUTH: authenticatedUsers=${users.length} user=${users.map((u) => u.user).join(',') || 'n/a'}`);
      const roles = (status.authInfo && status.authInfo.authenticatedUserRoles) || [];
      log(`AUTH: roles=${roles.map((r) => `${r.role}@${r.db}`).join(',') || 'n/a'}`);
    } catch (err) {
      log(`AUTH: connectionStatus denied -> ${err.code || err.name}`);
    }

    try {
      const dbs = await client.db('admin').command({ listDatabases: 1, nameOnly: true });
      log(`PRIV: listDatabases ALLOWED -> ${dbs.databases.length} databases`);
    } catch (err) {
      log(`PRIV: listDatabases denied -> code=${err.code || err.name} (least privilege expected)`);
    }

    const db = client.db('HackHub');
    try {
      const cols = await db.listCollections({}, { nameOnly: true }).toArray();
      log(`DATA: HackHub collections visible=${cols.length}`);
      log(`DATA: collection names -> ${cols.map((c) => c.name).sort().join(',')}`);
      for (const c of cols.slice(0, 40)) {
        try {
          const n = await db.collection(c.name).estimatedDocumentCount();
          log(`DATA: ${c.name} estimatedCount=${n}`);
        } catch (err) {
          log(`DATA: ${c.name} count denied -> ${err.code || err.name}`);
        }
      }
    } catch (err) {
      log(`DATA: listCollections denied -> ${err.code || err.name}`);
    }

    // Prove write capability is NOT tested (would mutate production data).
    log('WRITE: not attempted by design (no production mutation)');

    // Try a harmless read-only admin diagnostic that a full-privilege user has.
    try {
      const bi = await client.db('admin').command({ buildInfo: 1 });
      log(`PRIV: buildInfo ALLOWED -> mongodb ${bi.version}`);
    } catch (err) {
      log(`PRIV: buildInfo denied -> code=${err.code || err.name}`);
    }
  } finally {
    await client.close().catch(() => {});
  }
}

(async () => {
  log('=== Atlas read-only audit check ===');
  log(new Date().toISOString());
  await unauthenticatedCheck();
  await authenticatedCheck();
  log('=== done ===');
})().catch((err) => {
  console.error('FATAL:', redact(err));
  process.exit(1);
});
