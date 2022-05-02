var { Gateway, Wallets } = require('fabric-network');
var FabricCAServices = require('fabric-ca-client');
var path = require('path');
var fs = require('fs');

var channelName = 'channel1';
var chaincodeName = 'basic';
var mspOrg1 = 'Org1MSP';
var walletPath = path.join(__dirname, 'wallet');
var org1UserId = 'appUser';

const adminUserId = 'admin';
const adminUserPasswd = 'adminpw';

const buildCCPOrg1 = function(orgnum = 1) {
    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', `org${orgnum}.example.com`, `connection-org${orgnum}.json`);
    const fileExists = fs.existsSync(ccpPath);
    if (!fileExists) {
        throw new Error(`no such file or directory: ${ccpPath}`);
    }
    const contents = fs.readFileSync(ccpPath, 'utf8');
  
    const ccp = JSON.parse(contents);
  
    console.log(`Loaded the network configuration located at ${ccpPath}`);
    return ccp;
  };
  
  // Inpiration from fabric-samples
  const buildWallet = async function (Wallets, walletPath) {
    let wallet;
    if (walletPath) {
        wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Built a file system wallet at ${walletPath}`);
    } else {
        wallet = await Wallets.newInMemoryWallet();
        console.log('Built an in memory wallet');
    }
  
    return wallet;
  };
  
  // Inpiration from fabric-samples
  const prettyJSONString = function(inputString) {
    try{
        if(inputString)
           return JSON.stringify(JSON.parse(inputString), null, 2);
        else
            return "";
    } catch(e) {
        console.log(`Exception error ${e} thrown by JSON.*, result is: ${inputString}`);
        return ""
    }
  }
  // Inpiration from fabric-samples
  function buildCAClient (FabricCAServices, ccp, caHostName) {
      const caInfo = ccp.certificateAuthorities[caHostName]; 
      const caTLSCACerts = caInfo.tlsCACerts.pem;
      const caClient = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
      return caClient;
  };
  
  // Inpiration from fabric-samples
  async function enrollAdmin (caClient, wallet, orgMspId){
      try {
          // Check to see if we've already enrolled the admin user.
          const identity = await wallet.get(adminUserId);
          if (identity) {
              console.log('An identity for the admin user already exists in the wallet');
              return;
          }
  
          // Enroll the admin user, and import the new identity into the wallet.
          const enrollment = await caClient.enroll({ enrollmentID: adminUserId, enrollmentSecret: adminUserPasswd });
          const x509Identity = {
              credentials: {
                  certificate: enrollment.certificate,
                  privateKey: enrollment.key.toBytes(),
              },
              mspId: orgMspId,
              type: 'X.509',
          };
          await wallet.put(adminUserId, x509Identity);
          console.log('Successfully enrolled admin user and imported it into the wallet');
      } catch (error) {
          console.error(`Failed to enroll admin user : ${error}`);
      }
  };
  
  // Inpiration from fabric-samples
  async function registerAndEnrollUser (caClient, wallet, orgMspId, userId, affiliation){
      try {
          // Check to see if we've already enrolled the user
          const userIdentity = await wallet.get(userId);
          if (userIdentity) {
              console.log(`An identity for the user ${userId} already exists in the wallet`);
              return;
          }
  
          // Must use an admin to register a new user
          const adminIdentity = await wallet.get(adminUserId);
          if (!adminIdentity) {
              console.log('An identity for the admin user does not exist in the wallet');
              console.log('Enroll the admin user before retrying');
              return;
          }
  
          // build a user object for authenticating with the CA
          const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
          const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
  
          console.log(caClient);
          // Register the user, enroll the user, and import the new identity into the wallet.
          // if affiliation is specified by client, the affiliation value must be configured in CA
          const secret = await caClient.register({
              affiliation: affiliation,
              enrollmentID: userId,
              role: 'client'
          }, adminUser);
          console.log("register done");
          const enrollment = await caClient.enroll({
              enrollmentID: userId,
              enrollmentSecret: secret
          });
          const x509Identity = {
              credentials: {
                  certificate: enrollment.certificate,
                  privateKey: enrollment.key.toBytes(),
              },
              mspId: orgMspId,
              type: 'X.509',
          };
          //console.log(x509Identity)
          await wallet.put(userId, x509Identity);
          console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
      } catch (error) {
          console.error(`Failed to register user : ${error}`);
      }
  };



async function test1(contract, testNr){
    console.log('--> Running test 1: create new flight');
    let testResult = 'PASSED';
    let result;
    
    try{
        result = await contract.submitTransaction('createFlight', 'BUD', 'DUB', '30042022-1048', '350', 'BS');
        if (`${result}` !== '') {
            console.log(`createFlight: completed`);
        }
    }catch{
        console.log(`createFlight: failed`);
        testResult = 'FAILED';
        console.log(`*** RESULT TEST1 : FAILED`);
        return 0;
    }

    
    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    return 1;
}

async function test2(contract, testNr){
    console.log('\n\n' + `--> Running test ${testNr}: create flight as Travel agency (error expected)`);
    let testResult = 'FAILED';

    let result;
    try{
        result = await contract.submitTransaction('createFlight', 'BUD', 'DUB', '30042022-1048', '350', 'TA');
        if (`${result}` !== '') {
            console.log(`createFlight: completed`);
        }
    }catch{
        testResult = 'PASSED';
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}


async function test3(contract, testNr){
    console.log('\n\n' + `--> Running test ${testNr}: create multiple flights, than check if they are all in ledger`);
    let testResult = 'PASSED';

    let result;
    try{
        result = await contract.submitTransaction('createFlight', 'ABC', 'CBA', '30042022-1048', '35', 'BS');
        result = await contract.submitTransaction('createFlight', 'DEF', 'FED', '30042022-1048', '120', 'EC');
        result = await contract.submitTransaction('createFlight', 'GHI', 'IHG', '30042022-1048', '100', 'EC');
        result = await contract.submitTransaction('createFlight', 'JKL', 'LKJ', '30042022-1048', '180', 'EC');
        if (`${result}` !== '') {
            console.log(`createFlight: completed`);
        }
    }catch{
        testResult = 'FAILED';
    }

    try{
        result = await contract.evaluateTransaction('getAllFlights');
        console.log(`${prettyJSONString(result.toString())}`);
	    console.log(`getAllFlights: completed`);
    }catch{
        console.log(`getAllFlights: failed`);
        testResult = 'FAILED';
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}


async function test4(contract, testNr){
    console.log('\n\n' + `--> Running test ${testNr}: get flight by flight number`);
    let testResult = 'PASSED';
    let result;
    
    try{
        result = await contract.submitTransaction('createFlight', 'BUD', 'DUB', '30042022-1048', '350', 'BS');
        if (`${result}` !== '') {
            console.log(`createFlight: completed`);
        }
    }catch{
        console.log(`createFlight: failed`);
        testResult = 'FAILED';
    }

    try{
        result = await contract.evaluateTransaction('getFlight', 'BS0');
        console.log(`getFlight: completed`);
    }catch{
        console.log(`getFlight: failed`);
        testResult = 'FAILED';
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}


async function test5(contract, testNr){
    console.log('\n\n' +`--> Running test ${testNr}: try to get non existing flight (fail expected)`);
    let testResult = 'PASSED';
    let result;

    try{
        result = await contract.evaluateTransaction('getFlight', 'DM0');
        console.log(`getFlight: completed`);
        testResult = 'FAILED';
    }catch{
        console.log(`getFlight: failed`);
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}


async function test6(contract, testNr){
    console.log('\n\n' +`--> Running test ${testNr}: try to get reservation, not a flight (fail expected)`);
    let testResult = 'PASSED';
    let result;

    try{
        result = await contract.evaluateTransaction('getFlight', 'R0');
        if (`${result}` !== '') {
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        }
        console.log(`getFlight: completed`);
        testResult = 'FAILED';
    }catch{
        console.log(`getFlight: failed`);
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}



async function test7(contract,  testNr){
    console.log('\n\n' +`--> Running test ${testNr}: create reservation`);
    let testResult = 'PASSED';
    let result;

    try{
        result = await contract.submitTransaction('reserveSeats', 'BS0', JSON.stringify(["Viki Koste"]), 'viki@koste.com', 1);
        if (`${result}` !== '') {
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        }
        console.log(`reserveSeats: completed`);
    }catch{
        console.log(`reserveSeats: failed`);
        testResult = 'FAILED';
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}


async function test8(contract,  testNr){
    console.log('\n\n' +`--> Running test ${testNr}: wrong organization calling function (error expected)`);
    let testResult = 'PASSED';
    let result;

    try{
        result = await contract.submitTransaction( 'reserveSeats', 'BadlyAbroad', 'BS0', JSON.stringify(["Viki Koste"]), 'viki@koste.com', 1);
        if (`${result}` !== '') {
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        }
        console.log(`reserveSeats: completed`);
        testResult = 'FAILED';
    }catch{
        console.log(`reserveSeats: failed`);
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}


async function test9(contract,  testNr){
    console.log('\n\n' +`--> Running test ${testNr}: number of seats is not matching number of names (error expected)`);
    let testResult = 'PASSED';
    let result;

    try{
        result = await contract.submitTransaction( 'reserveSeats', 'BadlyAbroad', 'BS0', JSON.stringify(["Viki Koste", "Lukas Valaska"]), 'viki@koste.com', 3);
        if (`${result}` !== '') {
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        }
        console.log(`reserveSeats: completed`);
        testResult = 'FAILED';
    }catch{
        console.log(`reserveSeats: failed`);
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}


async function test10(contract, testNr){
    console.log('\n\n' +`--> Running test ${testNr}: book some seats`);
    let testResult = 'PASSED';
    let result;

    try{        
        result = await contract.submitTransaction( 'reserveSeats', 'BS0', JSON.stringify(['Viki Koste']), 'viki@koste.com', 1);
        console.log('*** Result: committed');
        if (`${result}` !== '') {
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        }
        
        result = JSON.parse(result);
        var reservationNr = result.reservationNr;

        result = await contract.submitTransaction( 'bookSeats', reservationNr, 'BS');
        if (`${result}` !== '') {
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        }
        console.log(`bookSeats: completed`);
    }catch{
        console.log(`bookSeats: failed`);
        testResult = 'FAILED';
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}


async function test11(contract, testNr){
    console.log('\n\n' +`--> Running test ${testNr}: try to check in`);
    let testResult = 'PASSED';
    let result;

    try{        
        result = await contract.submitTransaction( 'reserveSeats', 'BS0', JSON.stringify(['Viki Koste']), 'viki@koste.com', 1);
        console.log('*** Result: committed');
        if (`${result}` !== '') {
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        }

        result = JSON.parse(result);
        var reservationNr = result.reservationNr;
        
        result = await contract.submitTransaction( 'bookSeats', reservationNr, 'BS');
        if (`${result}` !== '') {
            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        }

        result = await contract.evaluateTransaction('checkIn', reservationNr, [{cusName: 'Viki Koste', passport: 'OP123456'}]);
        console.log(`bookSeats: completed`);
    }catch{
        console.log(`bookSeats: failed`);
        testResult = 'FAILED';
    }

    console.log('\n' + `*** RESULT TEST${testNr} : ${testResult}`);
    if(testResult == 'PASSED'){
        return 1;
    }
    return 0;
}


//app3.js
async function runTests(contract){
    await contract.submitTransaction('InitLedger');
    console.log(`InitLedger: completed` + '\n');
    let passed = 0;
    let numOfTests = 0;

    // createFlight tests
    passed += await test1(contract, ++numOfTests);   //create new flight, then get this flight
    passed += await test2(contract, ++numOfTests);   //create flight as Travel agency (error expected)
    passed += await test3(contract, ++numOfTests);   //create multiple flights, than check if they are all in ledger

    // getFlight tests
    passed += await test4(contract, ++numOfTests);   //get flight by flight number
    passed += await test5(contract, ++numOfTests);   //try to get non existing flight
    passed += await test6(contract, ++numOfTests);   //try to get reservation, not a flight

    // reserveSeats tests
    passed += await test7(contract, ++numOfTests);   //create reservation
    passed += await test8(contract, ++numOfTests);   //wrong organization calling function
    passed += await test9(contract, ++numOfTests);   //number of seats is not matching number of names

    // bookSeats tests
    passed += await test10(contract, ++numOfTests);   //book some seats

    // check in tests
    passed += await test11(contract, ++numOfTests);   //try check in

    console.log('\n...................................................');
    console.log('\n' + `OVERALL TESTS RESULT: ${passed}/${numOfTests}`);
    return;
}




async function changeOrg(org1UserId){
    channelName = "channel1";
    chaincodeName = 'basic';
    ccp = null;
    walletPath = null;
    //org1UserId = "TA";
    org = 0;
    if(org1UserId == 'EC' || org1UserId == 'BS'){
        organization = 'Airline';
        org = '1';
        ccp = buildCCPOrg1(1);
        walletPath = path.join(__dirname, 'wallet', '1');
    } else if(org1UserId == 'TA') {
        organization = 'TravelAgency';
        org = '2'
        ccp = buildCCPOrg1(2);
        walletPath = path.join(__dirname, 'wallet', '2');
    } else if (org1UserId == 'CU'){
        organization = 'Customer';
        org = '3'
        ccp = buildCCPOrg1(3);
        walletPath = path.join(__dirname, 'wallet', '3');
    } else{
        console.log('!!!Choose correct organization!!!');
        return;
    }
    caClient = buildCAClient(FabricCAServices, ccp, `ca.org${org}.example.com`);
    wallet = await buildWallet(Wallets, walletPath);
    await enrollAdmin(caClient, wallet, `Org${org}MSP`);
    await registerAndEnrollUser(caClient, wallet, `Org${org}MSP`, org1UserId, `org${org}.department1`);
    gateway = new Gateway();
    console.log("ORG ID: ", org1UserId);
    await gateway.connect(ccp, {
        wallet,
        identity: org1UserId,
        discovery: { enabled: true, asLocalhost: true }
    });
    network = await gateway.getNetwork(channelName);
    return network.getContract(chaincodeName);
}




/**
 *  A test application to show basic queries operations with any of the asset-transfer-basic chaincodes
 *   -- How to submit a transaction
 *   -- How to query and check the results
 *
 * To see the SDK workings, try setting the logging to show on the console before running
 *        export HFC_LOGGING='{"debug":"console"}'
 */
 async function main() {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		var ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		var caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		var wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');
		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		var gateway = new Gateway();

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			var network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			var contract = network.getContract(chaincodeName);

            await contract.submitTransaction('InitLedger');
            console.log(`InitLedger: completed` + '\n');

            let passed = 0;
            let numOfTests = 0;

            // createFlight tests
            passed += await test1(contract, ++numOfTests);   //create new flight, then get this flight
            passed += await test2(contract, ++numOfTests);   //create flight as Travel agency (error expected)
            passed += await test3(contract, ++numOfTests);   //create multiple flights, than check if they are all in ledger

            // getFlight tests
            passed += await test4(contract, ++numOfTests);   //get flight by flight number
            passed += await test5(contract, ++numOfTests);   //try to get non existing flight
            passed += await test6(contract, ++numOfTests);   //try to get reservation, not a flight

            gateway.disconnect();

            
            
            

            contract = await changeOrg("TA");


            // reserveSeats tests
            passed += await test7(contract, ++numOfTests);   //create reservation
            passed += await test8(contract, ++numOfTests);   //wrong organization calling function
            passed += await test9(contract, ++numOfTests);   //number of seats is not matching number of names

            gateway.disconnect();

            contract = await changeOrg("BS");


            // bookSeats tests
            passed += await test10(contract, ++numOfTests);   //book some seats

            gateway.disconnect();

            contract = await changeOrg("TA");

            // check in tests
            passed += await test11(contract, ++numOfTests);   //try check in

            console.log('\n...................................................');
            console.log('\n' + `OVERALL TESTS RESULT: ${passed}/${numOfTests}`);
            gateway.disconnect();
            return;

		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

main();