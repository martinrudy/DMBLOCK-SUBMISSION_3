#!/bin/bash

export PATH=/Users/pc/Documents/FIIT/DMBLOCK/cviko8/fabric-samples/bin:$PATH

# switch to the base folder
cd test-network

./network.sh down
# bring up the network
./network.sh up createChannel -c channel1 -ca

# install default CC - asset-transfer (basic) chaincode
cd ../asset-transfer-basic/chaincode-javascript
npm install 
cd ../../test-network

export FABRIC_CFG_PATH=$PWD/../config/

peer lifecycle chaincode package basic.tar.gz --path ../asset-transfer-basic/chaincode-javascript/ --lang node --label basic_1.0

# install one peer0 Org1
source ./scripts/envVar.sh

setGlobals 1
peer lifecycle chaincode install basic.tar.gz

# install one peer0 Org2
setGlobals 2
peer lifecycle chaincode install basic.tar.gz


cd ./addOrg3
bash ./addOrg3.sh up -c channel1 -ca
cd ../

# install one peer0 Org3
setGlobals 3
peer lifecycle chaincode install basic.tar.gz

# check installed chaincode and get PKID
setGlobals 1
tmp=$(peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051 --tlsRootCertFiles organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt | grep -o "basic_1.0:.*" | cut -d',' -f1)
export PKGID=$(echo $tmp)

# approve for Org1
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --version 1 --package-id $PKGID --sequence 1

# approve for Org2
setGlobals 2
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --version 1 --package-id $PKGID --sequence 1


# approve for Org2
setGlobals 3
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --version 1 --package-id $PKGID --sequence 1

# commit the CC
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --peerAddresses localhost:7051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --peerAddresses localhost:11051 --tlsRootCertFiles organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt --version 1 --sequence 1

# check committed chaincode
peer lifecycle chaincode querycommitted --channelID channel1 --name basic --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

