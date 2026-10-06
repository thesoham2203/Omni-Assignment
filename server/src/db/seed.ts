import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import { getDb } from './index';
import { runMigrations } from './migrate';

export async function seedDatabase(db?: Database.Database): Promise<void> {
  const database = db ?? getDb();

  // Run migrations first (idempotent)
  runMigrations(database);

  // Check if already seeded
  const existingWorkspace = database
    .prepare('SELECT id FROM workspaces WHERE id = ?')
    .get('ws-acme');

  if (existingWorkspace) {
    console.log('Database already seeded, skipping...');
    return;
  }

  const acmeId = 'ws-acme';
  const globeId = 'ws-globe';
  const aliceId = 'user-alice';
  const bobId = 'user-bob';

  const acmePass = await bcrypt.hash('acme1234', 10);
  const globePass = await bcrypt.hash('globe1234', 10);

  const insertWorkspace = database.prepare(
    'INSERT INTO workspaces (id, name) VALUES (?, ?)'
  );
  const insertUser = database.prepare(
    'INSERT INTO users (id, workspace_id, email, password_hash, name) VALUES (?, ?, ?, ?, ?)'
  );
  const insertRequest = database.prepare(`
    INSERT INTO requests (id, workspace_id, customer_name, service, description, scheduled_date, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertActivity = database.prepare(`
    INSERT INTO activity_log (id, request_id, workspace_id, action, details, performed_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seedAll = database.transaction(() => {
    // Workspaces
    insertWorkspace.run(acmeId, 'Acme Corp');
    insertWorkspace.run(globeId, 'Globe Ltd');

    // Users
    insertUser.run(aliceId, acmeId, 'alice@acme.com', acmePass, 'Alice Smith');
    insertUser.run(bobId, globeId, 'bob@globeltd.com', globePass, 'Bob Jones');

    // Acme Corp requests
    insertRequest.run('req-a1', acmeId, 'John Doe', 'Lawn Mowing', 'Weekly lawn service needed', '2024-03-15', 'NEW', aliceId);
    insertActivity.run('act-a1', 'req-a1', acmeId, 'CREATED', 'Request created', aliceId);

    insertRequest.run('req-a2', acmeId, 'Jane Smith', 'Pest Control', 'Ant infestation in kitchen', '2024-03-20', 'QUALIFIED', aliceId);
    insertActivity.run('act-a2', 'req-a2', acmeId, 'CREATED', 'Request created', aliceId);
    insertActivity.run('act-a3', 'req-a2', acmeId, 'STATUS_CHANGED', 'Status changed from NEW to QUALIFIED', aliceId);

    insertRequest.run('req-a3', acmeId, 'Bob Brown', 'Pool Cleaning', 'Monthly pool maintenance', '2024-03-25', 'CLOSED', aliceId);
    insertActivity.run('act-a4', 'req-a3', acmeId, 'CREATED', 'Request created', aliceId);
    insertActivity.run('act-a5', 'req-a3', acmeId, 'STATUS_CHANGED', 'Status changed from NEW to CLOSED', aliceId);

    insertRequest.run('req-a4', acmeId, 'Mary Johnson', 'House Cleaning', 'Deep clean entire house', '2024-04-01', 'NEW', aliceId);
    insertActivity.run('act-a6', 'req-a4', acmeId, 'CREATED', 'Request created', aliceId);

    insertRequest.run('req-a5', acmeId, 'Tom Wilson', 'HVAC Repair', 'AC not cooling properly', null, 'QUALIFIED', aliceId);
    insertActivity.run('act-a7', 'req-a5', acmeId, 'CREATED', 'Request created', aliceId);
    insertActivity.run('act-a8', 'req-a5', acmeId, 'STATUS_CHANGED', 'Status changed from NEW to QUALIFIED', aliceId);

    insertRequest.run('req-a6', acmeId, 'Sarah Davis', 'Plumbing', 'Leaky faucet in bathroom', '2024-04-10', 'NEW', aliceId);
    insertActivity.run('act-a9', 'req-a6', acmeId, 'CREATED', 'Request created', aliceId);

    insertRequest.run('req-a7', acmeId, 'Chris Lee', 'Electrical', 'Install outdoor lighting', '2024-04-15', 'QUALIFIED', aliceId);
    insertActivity.run('act-a10', 'req-a7', acmeId, 'CREATED', 'Request created', aliceId);
    insertActivity.run('act-a11', 'req-a7', acmeId, 'STATUS_CHANGED', 'Status changed from NEW to QUALIFIED', aliceId);

    insertRequest.run('req-a8', acmeId, 'Linda Martinez', 'Painting', 'Exterior house painting', '2024-05-01', 'CLOSED', aliceId);
    insertActivity.run('act-a12', 'req-a8', acmeId, 'CREATED', 'Request created', aliceId);
    insertActivity.run('act-a13', 'req-a8', acmeId, 'STATUS_CHANGED', 'Status changed from QUALIFIED to CLOSED', aliceId);

    // Globe Ltd requests
    insertRequest.run('req-b1', globeId, 'Frank Garcia', 'Web Design', 'Redesign company website', '2024-03-18', 'NEW', bobId);
    insertActivity.run('act-b1', 'req-b1', globeId, 'CREATED', 'Request created', bobId);

    insertRequest.run('req-b2', globeId, 'Olivia Clark', 'SEO Services', 'Improve search rankings', '2024-03-22', 'QUALIFIED', bobId);
    insertActivity.run('act-b2', 'req-b2', globeId, 'CREATED', 'Request created', bobId);
    insertActivity.run('act-b3', 'req-b2', globeId, 'STATUS_CHANGED', 'Status changed from NEW to QUALIFIED', bobId);

    insertRequest.run('req-b3', globeId, 'David White', 'Social Media', 'Manage Instagram & Facebook', null, 'NEW', bobId);
    insertActivity.run('act-b4', 'req-b3', globeId, 'CREATED', 'Request created', bobId);

    insertRequest.run('req-b4', globeId, 'Emma Harris', 'Email Marketing', 'Monthly newsletter setup', '2024-04-05', 'CLOSED', bobId);
    insertActivity.run('act-b5', 'req-b4', globeId, 'CREATED', 'Request created', bobId);
    insertActivity.run('act-b6', 'req-b4', globeId, 'STATUS_CHANGED', 'Status changed from NEW to CLOSED', bobId);

    insertRequest.run('req-b5', globeId, 'James Turner', 'PPC Advertising', 'Google Ads campaign setup', '2024-04-12', 'QUALIFIED', bobId);
    insertActivity.run('act-b7', 'req-b5', globeId, 'CREATED', 'Request created', bobId);
    insertActivity.run('act-b8', 'req-b5', globeId, 'STATUS_CHANGED', 'Status changed from NEW to QUALIFIED', bobId);

    insertRequest.run('req-b6', globeId, 'Sophie Anderson', 'Content Writing', 'Blog posts and copywriting', '2024-04-20', 'NEW', bobId);
    insertActivity.run('act-b9', 'req-b6', globeId, 'CREATED', 'Request created', bobId);

    insertRequest.run('req-b7', globeId, 'Lucas Thompson', 'Video Production', 'Promotional video for product launch', '2024-05-05', 'QUALIFIED', bobId);
    insertActivity.run('act-b10', 'req-b7', globeId, 'CREATED', 'Request created', bobId);
    insertActivity.run('act-b11', 'req-b7', globeId, 'STATUS_CHANGED', 'Status changed from NEW to QUALIFIED', bobId);
  });

  seedAll();
  console.log('Database seeded successfully!');
  console.log('Demo credentials:');
  console.log('  Acme Corp:  alice@acme.com / acme1234');
  console.log('  Globe Ltd:  bob@globeltd.com / globe1234');
}

// Run directly if called as a script
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
