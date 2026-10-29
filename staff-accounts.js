/* Accesos del prototipo local. Las contraseñas se comprueban con PBKDF2. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('crypto').webcrypto);else root.FoodStaff=factory(root.crypto);})(typeof globalThis!=='undefined'?globalThis:this,function(crypto){
const accounts=[
  {
    "name": "Dueño",
    "email": "jorge.vera.vilchis@gmail.com",
    "username": "jorge.vera.vilchis@gmail.com",
    "role": "dueno",
    "authProvider": "local-staff",
    "firebaseUid": "local-staff-dueno",
    "salt": "c5a2c904ace79db827eaace899249c70",
    "passwordHash": "00eae0dbf23718c5ea9e8a0b434d606281c9907295d3bf35800fb7132a27cc82"
  },
  {
    "name": "Empleado",
    "email": "empleado@tizafood.local",
    "username": "empleado@tizafood.local",
    "role": "empleado",
    "authProvider": "local-staff",
    "firebaseUid": "local-staff-empleado",
    "salt": "e0e4b87400a3e4ef079cb29ad388576d",
    "passwordHash": "cf8020945a4bafeb057bf8f34e8d5edaf6280d4f9b04a1baa48b17c762b5b7bf"
  }
];
const emailOf=v=>String(v||'').trim().toLowerCase();
const find=email=>accounts.find(u=>u.email===emailOf(email));
const attempts=new Map();
async function authenticate(body){
 const account=find(body.email||body.username);if(!account)return null;
 const attempt=attempts.get(account.email)||{count:0,until:0};
 if(attempt.until>Date.now())throw Error('Espera 15 minutos antes de volver a intentar.');
 const password=String(body.password||'');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(account.salt),iterations:100000},key,256);
 const hash=Array.from(new Uint8Array(bits),v=>v.toString(16).padStart(2,'0')).join('');
 if(password.length>256||hash!==account.passwordHash){attempt.count++;if(attempt.count>=5){attempt.count=0;attempt.until=Date.now()+900000;}attempts.set(account.email,attempt);throw Error('Correo o contraseña incorrectos.');}
 if(body.staffRole&&body.staffRole!==account.role)throw Error('Esta cuenta no tiene permiso para este panel.');
 attempts.delete(account.email);const {salt,passwordHash,...user}=account;return user;
}
return {accounts,find,authenticate};
});
