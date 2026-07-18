const https = require('https');
const url = new URL('https://jmdwygoqnwmsyuyhfuef.supabase.co/rest/v1/profiles?select=*');
const req = https.request({
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdWV2cG94dWxka3J3a3ZuYW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTIyOTksImV4cCI6MjA5OTE4ODI5OX0.49vCMaGYW7hNhQocnNl6DdcJ8ucwI7_Qsx08fmt1lcY',
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdWV2cG94dWxka3J3a3ZuYW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTIyOTksImV4cCI6MjA5OTE4ODI5OX0.49vCMaGYW7hNhQocnNl6DdcJ8ucwI7_Qsx08fmt1lcY',
    Accept: 'application/json',
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log(body.slice(0, 2000));
  });
});
req.on('error', err => {
  console.error(err);
  process.exit(1);
});
req.end();
