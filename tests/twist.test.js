const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const { db, exec, run, all } = require('../src/config/database');
const { initializeDatabase } = require('../src/db/initDb');

let server;
let baseUrl;

describe('🌱 SeedShare Garden - Twist & Core Requirements Test Suite', () => {
  before(async () => {
    // Initialize schema
    await initializeDatabase();

    // Start server on an ephemeral free port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Close server and database connection
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
  });

  beforeEach(async () => {
    // Clear data between tests for isolation
    await exec(`
      DELETE FROM leases;
      DELETE FROM plots;
      DELETE FROM gardeners;
      DELETE FROM sqlite_sequence WHERE name IN ('leases', 'plots', 'gardeners');
    `);
  });

  // ==========================================
  // TWIST RULE TESTS (Mandated by assignment)
  // ==========================================

  test('Test 3: No plots at all -> GET /plots/summary returns 200 with an empty list []', async () => {
    const res = await fetch(`${baseUrl}/plots/summary`);
    assert.strictEqual(res.status, 200, 'Expected status code 200');

    const data = await res.json();
    assert.ok(Array.isArray(data), 'Response should be an array');
    assert.strictEqual(data.length, 0, 'Response array should be empty when no plots exist');
  });

  test('Test 1 & Test 2: Add plots in two soil values, then GET /plots/summary returns 200 with a count for each', async () => {
    // Test 1: Add plots in two soil values (Loam and Sandy)
    const plot1 = await fetch(`${baseUrl}/plots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'North Ridge A', soil: 'Loam' })
    });
    assert.strictEqual(plot1.status, 201, 'Plot 1 should be created with 201 Created');

    const plot2 = await fetch(`${baseUrl}/plots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'North Ridge B', soil: 'Loam' })
    });
    assert.strictEqual(plot2.status, 201, 'Plot 2 should be created with 201 Created');

    const plot3 = await fetch(`${baseUrl}/plots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Sunny Valley 1', soil: 'Sandy' })
    });
    assert.strictEqual(plot3.status, 201, 'Plot 3 should be created with 201 Created');

    // Test 2: GET /plots/summary -> 200 with count for each
    const summaryRes = await fetch(`${baseUrl}/plots/summary`);
    assert.strictEqual(summaryRes.status, 200, 'Summary endpoint should return status 200');

    const summary = await summaryRes.json();
    assert.ok(Array.isArray(summary), 'Summary should be an array');
    assert.strictEqual(summary.length, 2, 'Summary should contain exactly 2 soil groups');

    const loamGroup = summary.find((item) => item.soil === 'Loam');
    const sandyGroup = summary.find((item) => item.soil === 'Sandy');

    assert.ok(loamGroup, 'Loam soil group should be present in summary');
    assert.strictEqual(loamGroup.count, 2, 'Loam count should be 2');

    assert.ok(sandyGroup, 'Sandy soil group should be present in summary');
    assert.strictEqual(sandyGroup.count, 1, 'Sandy count should be 1');
  });

  // ==========================================
  // CORE REQUIREMENTS TESTS
  // ==========================================

  test('Core: Validation fails on POST /plots when soil or name is missing (status 400)', async () => {
    // Missing soil
    const resNoSoil = await fetch(`${baseUrl}/plots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Invalid Plot' })
    });
    assert.strictEqual(resNoSoil.status, 400, 'Should return 400 Bad Request');
    const errData = await resNoSoil.json();
    assert.ok(errData.error, 'Error property should exist');
    assert.match(errData.message, /soil/i, 'Error message should clearly mention soil');

    // Missing name
    const resNoName = await fetch(`${baseUrl}/plots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soil: 'Clay' })
    });
    assert.strictEqual(resNoName.status, 400, 'Should return 400 Bad Request');
  });

  test('Core: Search plots by query parameter (?soil=Loam)', async () => {
    // Seed test plots
    await run("INSERT INTO plots (name, soil) VALUES ('Plot A', 'Loam'), ('Plot B', 'Clay'), ('Plot C', 'Loam');");

    const searchRes = await fetch(`${baseUrl}/plots?soil=Loam`);
    assert.strictEqual(searchRes.status, 200);

    const data = await searchRes.json();
    assert.strictEqual(data.length, 2, 'Should only return the 2 Loam plots');
    assert.ok(data.every((p) => p.soil.toLowerCase() === 'loam'));
  });

  test('Core: Plots CRUD - GET, GET/:id, PUT, DELETE', async () => {
    // 1. Create
    const createRes = await fetch(`${baseUrl}/plots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Plot to Update', soil: 'Chalk' })
    });
    assert.strictEqual(createRes.status, 201);
    const created = await createRes.json();
    const id = created.id;

    // 2. Get One
    const getRes = await fetch(`${baseUrl}/plots/${id}`);
    assert.strictEqual(getRes.status, 200);
    const single = await getRes.json();
    assert.strictEqual(single.name, 'Plot to Update');

    // 3. Update (PUT)
    const putRes = await fetch(`${baseUrl}/plots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Plot Updated', soil: 'Peat' })
    });
    assert.strictEqual(putRes.status, 200);
    const updated = await putRes.json();
    assert.strictEqual(updated.name, 'Plot Updated');
    assert.strictEqual(updated.soil, 'Peat');

    // 4. Delete
    const deleteRes = await fetch(`${baseUrl}/plots/${id}`, { method: 'DELETE' });
    assert.strictEqual(deleteRes.status, 200);

    // 5. Verify 404 after delete
    const verifyRes = await fetch(`${baseUrl}/plots/${id}`);
    assert.strictEqual(verifyRes.status, 404);
  });

  test('Core: JOIN endpoint (GET /leases) returns leases joined with gardener name and plot name', async () => {
    // Insert gardener
    const gResult = await run("INSERT INTO gardeners (name, email) VALUES ('Alice Green', 'alice@test.com')");
    // Insert plot
    const pResult = await run("INSERT INTO plots (name, soil) VALUES ('Plot 1 - Garden', 'Loam')");
    // Insert lease
    await run("INSERT INTO leases (gardener_id, plot_id, start_date) VALUES (?, ?, '2026-03-01')", [
      gResult.lastID,
      pResult.lastID
    ]);

    const leasesRes = await fetch(`${baseUrl}/leases`);
    assert.strictEqual(leasesRes.status, 200);

    const leases = await leasesRes.json();
    assert.strictEqual(leases.length, 1);
    const lease = leases[0];

    assert.strictEqual(lease.gardener_name, 'Alice Green', 'JOIN should include gardener_name');
    assert.strictEqual(lease.plot_name, 'Plot 1 - Garden', 'JOIN should include plot_name');
    assert.strictEqual(lease.plot_soil, 'Loam', 'JOIN should include plot_soil');
  });
});
