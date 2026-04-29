const fetch = require('node-fetch');
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@master.com', password: 'password123' })
}).then(res => res.text()).then(console.log);
