const http = require('http');

async function test() {
  const data = JSON.stringify({
    firstName: "TestFirst",
    lastName: "TestLast"
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users/123-123-123',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => console.log('Response:', res.statusCode, responseData));
  });

  req.on('error', e => console.error(e));
  req.write(data);
  req.end();
}

test();
