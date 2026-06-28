import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

function generateKeys() {
  console.log('Generating RSA 2048-bit key pair...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  const privBase64 = Buffer.from(privateKey).toString('base64');
  const pubBase64 = Buffer.from(publicKey).toString('base64');

  console.log('\n--- PRIVATE KEY (Base64) ---');
  console.log(privBase64);
  
  console.log('\n--- PUBLIC KEY (Base64) ---');
  console.log(pubBase64);

  console.log('\n✅ Copy these strings to your .env file as JWT_TICKET_PRIVATE_KEY and JWT_TICKET_PUBLIC_KEY.');
}

generateKeys();
