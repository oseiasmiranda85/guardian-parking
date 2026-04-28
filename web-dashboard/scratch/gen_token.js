const { SignJWT } = require('jose');
const crypto = require('crypto');

async function generate() {
    const secret = new TextEncoder().encode('dev-secure-key-123');
    const token = await new SignJWT({ 
        tenantId: 21,
        role: 'MASTER'
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret);
    
    console.log(token);
}

generate();
