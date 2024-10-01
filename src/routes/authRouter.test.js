const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test('test user creation failure', async () => {
  const loginRes = await request(app).post('/api/auth').send({ email: 'dad@gmail.com', password: 'password' });
  expect(loginRes.status).toBe(400);
});

test('login test user', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
  expect(password).toBeTruthy();
});

test('logout test user', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.body.message).toBe("logout successful");
});

test('logout test user without token', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer wrongtoken`);
  expect(logoutRes.status).toBe(401)
});

afterAll(async () => {
  const connection = await DB.getConnection();
  try{
    await DB.query(connection, "DROP DATABASE testpizza");
    console.log("Destroying database")
  }
  finally{
    connection.end();
  }
});


