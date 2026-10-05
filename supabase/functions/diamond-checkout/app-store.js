// Apple's signed purchases (Oct 2026, the iPhone app 1.1). StoreKit gives the app every purchase as a JWS that Apple signed (the
// transaction's jwsRepresentation), and App Store Server Notifications V2 (app-store-notify) arrive signed the same way. This checks such
// a JWS here, with Web Crypto only: no key of ours and no call to Apple. The x5c chain must lead to Apple Root CA - G3 (pinned below by
// its SHA-256; x5c[2] is ignored, as Apple's own library ignores it), the intermediate must be a CA with Apple's WWDR marker and the leaf
// must carry the App Store receipt-signing marker, every certificate must be valid at the JWS's signedDate (not now: Apple's own library
// checks it there, and a leaf rotates about every two years), and the leaf's P-256 key must have signed the JWS (ES256).
// The certificates are read by a small DER reader that refuses whatever it does not expect: a malformed input throws, it never reads
// past the end of what it was given and every loop moves on, with lengths and counts bounded.
// Synced into diamond-checkout and app-store-notify (scripts/sync-game.mjs); tests/app-store-server.test.mjs runs it against a test CA.

// Apple Root CA - G3, https://www.apple.com/certificateauthority/AppleRootCA-G3.cer (DER, base64), valid 30 Apr 2014 to 30 Apr 2039.
export const APPLE_ROOT_G3='MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==';
// Its SHA-256 fingerprint, computed from Apple's own file (Apple's page shows none). A root that does not hash to this is refused.
export const APPLE_ROOT_G3_SHA256='63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';
// A notification's signedPayload carries a whole signed transaction inside it (about 18 KB in all); Apple's certificates are about 1 KB.
export const JWS_LIMIT=65536;
const CERT_LIMIT=8192,CERT_B64_LIMIT=Math.ceil(CERT_LIMIT/3)*4,SKEW_MS=60000,CACHE_MS=15*60000,CACHE_SIZE=32;
const OID=Object.freeze({leaf:'1.2.840.113635.100.6.11.1',intermediate:'1.2.840.113635.100.6.2.1',ecKey:'1.2.840.10045.2.1',
 p256:'1.2.840.10045.3.1.7',p384:'1.3.132.0.34',sha256:'1.2.840.10045.4.3.2',sha384:'1.2.840.10045.4.3.3',basicConstraints:'2.5.29.19'});
const CURVES=Object.freeze({[OID.p256]:'P-256',[OID.p384]:'P-384'});

const bad=what=>new Error(`Not a valid App Store signature: ${what}.`);
function bytes(s){const b=atob(s),out=new Uint8Array(b.length);for(let i=0;i<b.length;i++)out[i]=b.charCodeAt(i);return out;}
function b64url(s){if(typeof s!=='string'||s.length>JWS_LIMIT||!/^[A-Za-z0-9_-]*$/.test(s)||s.length%4===1)throw bad('base64url');return bytes(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));}
function b64cert(s){if(typeof s!=='string'||!s||s.length>CERT_B64_LIMIT||s.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))throw bad('x5c certificate');return bytes(s);}
const hex=u=>Array.from(u,b=>b.toString(16).padStart(2,'0')).join('');
// A JWS part that must be a JSON object (a header or a payload), in strict UTF-8.
function jsonPart(part){
 let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b64url(part)));}catch{throw bad('JSON');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw bad('JSON object');
 return value;
}

// One DER element at pos in buf: its tag, contents and whole encoding. Only one-byte tags and definite lengths of 1 to 3 length bytes
// (a certificate is a few KB), and nothing that runs past the end of buf.
function tlv(buf,pos){
 if(!(pos>=0&&pos+2<=buf.length))throw bad('DER');
 const tag=buf[pos];if((tag&0x1f)===0x1f)throw bad('DER tag');
 let len=buf[pos+1],at=pos+2;
 if(len&0x80){const n=len&0x7f;if(n<1||n>3||at+n>buf.length)throw bad('DER length');len=0;for(let i=0;i<n;i++)len=len*256+buf[at+i];at+=n;}
 if(at+len>buf.length)throw bad('DER length');
 return {tag,end:at+len,body:buf.subarray(at,at+len),raw:buf.subarray(pos,at+len)};
}
// buf holding exactly one element, of this tag.
function only(buf,tag){const t=tlv(buf,0);if(t.end!==buf.length||t.tag!==tag)throw bad('DER structure');return t;}
// The elements inside a constructed one (each step moves on by at least two bytes; at most max of them).
function kids(t,max=16){const out=[];for(let p=0;p<t.body.length;){if(out.length>=max)throw bad('DER structure');const c=tlv(t.body,p);out.push(c);p=c.end;}return out;}
function need(t,tag){if(!t||t.tag!==tag)throw bad('DER structure');return t;}
function oid(t){
 const b=need(t,0x06).body;if(b.length<1||b.length>32||b[b.length-1]&0x80)throw bad('OID');
 const parts=[];let v=0,n=0;
 for(const x of b){if(n===0&&x===0x80)throw bad('OID');v=v*128+(x&0x7f);if(++n>7)throw bad('OID');if(!(x&0x80)){parts.push(v);v=0;n=0;}}
 const first=Math.min(2,Math.floor(parts[0]/40));
 return [first,parts[0]-40*first,...parts.slice(1)].join('.');
}
// UTCTime (YYMMDDHHMMSSZ, 1950-2049) or GeneralizedTime (YYYYMMDDHHMMSSZ), as ms since 1970.
function time(t){
 if(t.body.length>15)throw bad('date');
 const s=String.fromCharCode(...t.body);
 const m=t.tag===0x17?/^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/.exec(s):t.tag===0x18?/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/.exec(s):null;
 if(!m)throw bad('date');
 const year=t.tag===0x17?Number(m[1])+(Number(m[1])>=50?1900:2000):Number(m[1]);
 return Date.UTC(year,Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]));
}
// The parts of an X.509 certificate this check needs: what was signed, how and by whom, the dates, the EC key, the extensions' ids and
// whether it is a CA.
function readCert(der){
 if(!(der instanceof Uint8Array)||der.length>CERT_LIMIT)throw bad('certificate size');
 const parts=kids(only(der,0x30));if(parts.length!==3)throw bad('certificate');
 const [tbs,alg,sig]=[need(parts[0],0x30),need(parts[1],0x30),need(parts[2],0x03)];
 if(sig.body.length<2||sig.body[0]!==0)throw bad('certificate signature');
 const f=kids(tbs),i=f[0]?.tag===0xa0?1:0;
 need(f[i],0x02);
 const sigAlg=oid(kids(alg,2)[0]);if(oid(kids(need(f[i+1],0x30),2)[0])!==sigAlg)throw bad('signature algorithm');
 const validity=kids(need(f[i+3],0x30),2);if(validity.length!==2)throw bad('validity');
 const spki=need(f[i+5],0x30),key=kids(spki,2);if(key.length!==2)throw bad('public key');need(key[1],0x03);
 const keyAlg=kids(need(key[0],0x30),2);if(keyAlg.length!==2||oid(keyAlg[0])!==OID.ecKey)throw bad('public key');
 const curve=CURVES[oid(keyAlg[1])];if(!curve)throw bad('curve');
 const oids=[];let ca=false;
 const extensions=f.slice(i+6).filter(x=>x.tag===0xa3);if(extensions.length>1)throw bad('extensions');
 for(const ext of extensions.length?kids(only(extensions[0].body,0x30),32):[]){
  const e=kids(need(ext,0x30),3);if(e.length<2)throw bad('extension');
  const id=oid(e[0]),value=need(e[e.length-1],0x04);oids.push(id);
  if(id===OID.basicConstraints){const bc=kids(only(value.body,0x30),2);ca=bc[0]?.tag===0x01&&bc[0].body.length===1&&bc[0].body[0]!==0;}
 }
 return {tbs:tbs.raw,sigAlg,sig:sig.body.subarray(1),issuer:hex(need(f[i+2],0x30).raw),subject:hex(need(f[i+4],0x30).raw),
  notBefore:time(validity[0]),notAfter:time(validity[1]),spki:spki.raw,curve,oids,ca};
}
// A certificate's ECDSA signature is DER (SEQUENCE of r and s); Web Crypto wants r||s, each size bytes.
function rawSignature(der,size){
 const rs=kids(only(der,0x30),2);if(rs.length!==2)throw bad('signature');
 const out=new Uint8Array(size*2);
 rs.forEach((t,n)=>{let v=need(t,0x02).body;if(!v.length||v[0]&0x80)throw bad('signature');while(v.length>1&&v[0]===0)v=v.subarray(1);if(v.length>size)throw bad('signature');out.set(v,n*size+size-v.length);});
 return out;
}
const ecKey=cert=>crypto.subtle.importKey('spki',cert.spki,{name:'ECDSA',namedCurve:cert.curve},false,['verify']);
async function signedBy(child,issuer){
 const hash=child.sigAlg===OID.sha384?'SHA-384':child.sigAlg===OID.sha256?'SHA-256':null;
 if(!hash||child.issuer!==issuer.subject)return false;
 return crypto.subtle.verify({name:'ECDSA',hash},await ecKey(issuer),rawSignature(child.sig,issuer.curve==='P-384'?48:32),child.tbs);
}

// Chains checked already (per root, leaf and intermediate), for 15 minutes as Apple's library keeps them: a warm function then only
// checks the dates and the JWS's own signature. Only a chain that passed is kept, and never more than a few.
const chains=new Map();
async function checkedChain(x5c,rootDer,root,now){
 const id=`${root}.${x5c[0]}.${x5c[1]}`,kept=chains.get(id);
 if(kept&&kept.until>now)return kept;
 const leaf=readCert(b64cert(x5c[0])),inter=readCert(b64cert(x5c[1])),top=readCert(rootDer);
 if(!inter.ca||!inter.oids.includes(OID.intermediate))throw bad('the intermediate is not Apple\'s WWDR CA');
 if(!leaf.oids.includes(OID.leaf))throw bad('the leaf is not an App Store signing certificate');
 if(leaf.curve!=='P-256')throw bad('the leaf is not P-256');
 if(!await signedBy(inter,top)||!await signedBy(leaf,inter))throw bad('the certificate chain does not lead to the root');
 const chain={certs:[leaf,inter,top],key:await ecKey(leaf),until:now+CACHE_MS};
 if(chains.size>=CACHE_SIZE)chains.clear();
 chains.set(id,chain);
 return chain;
}
let appleRoot=null;
// The payload of a JWS that Apple signed, or it throws. rootDer and rootSha256 are only for the tests' own CA; now is the clock (and
// the date to check the certificates at when a payload has no signedDate, as early notifications had none).
export async function verifyAppleJws(jws,{rootDer,rootSha256=APPLE_ROOT_G3_SHA256,now=Date.now()}={}){
 if(typeof jws!=='string'||jws.length>JWS_LIMIT)throw bad('size');
 const parts=jws.split('.');if(parts.length!==3)throw bad('JWS');
 const [h,p,s]=parts,header=jsonPart(h),payload=jsonPart(p),signature=b64url(s);
 if(header.alg!=='ES256'||!Array.isArray(header.x5c)||header.x5c.length!==3||!header.x5c.every(c=>typeof c==='string'))throw bad('JWS header');
 if(signature.length!==64)throw bad('JWS signature');
 const root=rootDer??(appleRoot??=bytes(APPLE_ROOT_G3));
 if(!(root instanceof Uint8Array)||root.length>CERT_LIMIT)throw bad('root');
 const fingerprint=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',root)));
 if(fingerprint!==String(rootSha256).toLowerCase())throw bad('the pinned root does not match');
 const chain=await checkedChain(header.x5c,root,fingerprint,now);
 const at=Number.isFinite(payload.signedDate)?payload.signedDate:now;
 for(const c of chain.certs)if(c.notBefore-SKEW_MS>at||c.notAfter+SKEW_MS<at)throw bad('a certificate was not valid at signedDate');
 if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},chain.key,signature,new TextEncoder().encode(`${h}.${p}`)))throw bad('the JWS signature does not match');
 return payload;
}
// The payload of a JWS without checking its signature: only for one verifyAppleJws checked already (or that sits inside one it
// checked), never to decide anything about a JWS nobody checked.
export function decodeJwsPayload(jws){
 if(typeof jws!=='string'||jws.length>JWS_LIMIT)throw bad('size');
 const parts=jws.split('.');if(parts.length!==3)throw bad('JWS');
 return jsonPart(parts[1]);
}
