#!/bin/sh
# A test CA shaped like Apple's App Store signing chain (Oct 2026, tests/app-store-server.test.mjs), made once with the openssl CLI
# (OpenSSL 3.4 or later, for -not_before/-not_after). Root P-384; intermediate P-384, a CA with Apple's WWDR marker
# 1.2.840.113635.100.6.2.1; leaf P-256 with the App Store receipt-signing marker 1.2.840.113635.100.6.11.1; all signed with SHA-384.
# Fixed dates, so the tests never run out: the tests sign their own JWS with leaf.key and choose its signedDate.
# The "-no-oid" and "-not-ca" twins keep the same key and name, so their signatures still match and only the missing marker refuses
# them. other-root.pem is a second root that signed nothing here. Only leaf.key is kept (the tests sign with it); the other keys go.
set -e
cd "$(dirname "$0")"
DAYS="-not_before 20200101000000Z -not_after 20450101000000Z"
openssl ecparam -name secp384r1 -genkey -noout -out root.key
openssl req -x509 -new -key root.key -sha384 -subj "/CN=Harvest Tycoon Test Root CA/O=Harvest Tycoon Tests" $DAYS -out root.pem \
 -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"
openssl ecparam -name secp384r1 -genkey -noout -out other-root.key
openssl req -x509 -new -key other-root.key -sha384 -subj "/CN=Harvest Tycoon Test Root CA/O=Harvest Tycoon Tests" $DAYS -out other-root.pem \
 -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"
openssl ecparam -name secp384r1 -genkey -noout -out intermediate.key
openssl req -new -key intermediate.key -subj "/CN=Harvest Tycoon Test WWDR CA/OU=G6/O=Harvest Tycoon Tests" -out intermediate.csr
cat > intermediate.ext <<'X'
basicConstraints=critical,CA:TRUE,pathlen:0
keyUsage=critical,keyCertSign,cRLSign
1.2.840.113635.100.6.2.1=DER:05:00
X
grep -v 1.2.840 intermediate.ext > intermediate-no-oid.ext
sed 's/CA:TRUE,pathlen:0/CA:FALSE/' intermediate.ext > intermediate-not-ca.ext
for name in intermediate intermediate-no-oid intermediate-not-ca; do
 openssl x509 -req -in intermediate.csr -CA root.pem -CAkey root.key -sha384 -not_before 20210101000000Z -not_after 20400101000000Z \
  -extfile $name.ext -set_serial 0x$(openssl rand -hex 8) -out $name.pem
done
openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt -out leaf.key
openssl req -new -key leaf.key -subj "/CN=Harvest Tycoon Test App Store Signing/O=Harvest Tycoon Tests" -out leaf.csr
printf 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n1.2.840.113635.100.6.11.1=DER:05:00\n' > leaf.ext
grep -v 1.2.840 leaf.ext > leaf-no-oid.ext
for name in leaf leaf-no-oid; do
 openssl x509 -req -in leaf.csr -CA intermediate.pem -CAkey intermediate.key -sha384 -not_before 20250101000000Z -not_after 20270101000000Z \
  -extfile $name.ext -set_serial 0x$(openssl rand -hex 8) -out $name.pem
done
rm -f root.key other-root.key intermediate.key *.csr *.ext
