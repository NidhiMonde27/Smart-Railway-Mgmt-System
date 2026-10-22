const fs = require('fs');
const path = require('path');
const webPush = require('web-push');

const envPath = path.join(__dirname, '../server/.env');
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

if (!envContent.includes('VAPID_PUBLIC_KEY')) {
  const vapidKeys = webPush.generateVAPIDKeys();
  const vapidConfig = `\n# Web Push VAPID Credentials\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}\nVAPID_SUBJECT=mailto:fs21co009nidhi@gmail.com\n`;
  fs.appendFileSync(envPath, vapidConfig, 'utf-8');
  console.log("Generated and appended VAPID Keys to server/.env successfully!");
  console.log("VAPID_PUBLIC_KEY:", vapidKeys.publicKey);
} else {
  console.log("VAPID keys already exist in server/.env");
}
