const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;
let testAdmin, adminAuth;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = Math.random().toString(36).substring(2, 12);
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
  testAdmin = await createAdminUser();
});

test('test user creation failure', async () => {
  const loginRes = await request(app).post('/api/auth').send({ email: 'dad@gmail.com', password: 'password' });
  expect(loginRes.status).toBe(400);
  expect(loginRes.body.message).toBe('name, email, and password are required')
});

test('login test user', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
  expect(password).toBeTruthy();
});

test('update test user bad auth', async () =>{
  const updateRes = await request(app).put(`/api/auth/${testUserId-1}`).set('Authorization', `Bearer ${testUserAuthToken}`).send({"email": testAdmin.email, "password": testAdmin.password})
  expect(updateRes.status).toBe(403);
  expect(updateRes.body.message).toBe("unauthorized");

});

test('logout test user', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.body.message).toBe("logout successful");
  expect(logoutRes.status).toBe(200);
});

test('update test user', async () =>{
  adminRes = await request(app).put('/api/auth').send({name: testAdmin.name, email: testAdmin.email, password: testAdmin.password});
  expect(adminRes.status).toBe(200);
  adminAuth = adminRes.body.token;
  const updateRes = await request(app).put(`/api/auth/${testUserId}`).set('Authorization', `Bearer ${adminAuth}`).send({"email": testAdmin.email, "password": testAdmin.password})
  expect(updateRes.status).toBe(200);
  expect(updateRes.body.id).toBe(testUserId);
});

test('logout test user without token', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer wrongtoken`);
  expect(logoutRes.status).toBe(401)
});

