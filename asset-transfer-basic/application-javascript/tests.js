var { Gateway, Wallets } = require('fabric-network');
var FabricCAServices = require('fabric-ca-client');
var path = require('path');
var fs = require('fs');
var { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
var { buildWallet } = require('../../test-application/javascript/AppUtil.js');

var channelName = 'channel1';
var chaincodeName = 'basic';
var mspOrg1 = 'Org1MSP';
var walletPath = path.join(__dirname, 'wallet');
var org1UserId = 'appUser';

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}


var buildCCPOrg1 = function(orgnum = 1) {
    var ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', `org${orgnum}.example.com`, `connection-org${orgnum}.json`);
    var fileExists = fs.existsSync(ccpPath);
    if (!fileExists) {
        throw new Error(`no such file or directory: ${ccpPath}`);
    }
    var contents = fs.readFileSync(ccpPath, 'utf8');
  
    var ccp = JSON.parse(contents);
  
    console.log(`Loaded the network configuration located at ${ccpPath}`);
    return ccp;
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

    /*let org1UserId = "TA";
    let channelName = "channel1";
    let chaincodeName = 'basic';
    let ccp = null;
    let walletPath = null;
    let org = 0;
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
    var caClient = buildCAClient(FabricCAServices, ccp, `ca.org${org}.example.com`);
    var wallet = await buildWallet(Wallets, walletPath);
    await enrollAdmin(caClient, wallet, `Org${org}MSP`);
    await registerAndEnrollUser(caClient, wallet, `Org${org}MSP`, org1UserId, `org${org}.department1`);
    var gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: org1UserId,
        discovery: { enabled: true, asLocalhost: true }
    });
    var network = await gateway.getNetwork(channelName);
    var contractNew = network.getContract(chaincodeName);
*/


    console.log('\n\n' +`--> Running test ${testNr}: create reservation`);
    let testResult = 'PASSED';
    let result;

    try{
        result = await contractNew.submitTransaction('reserveSeats', 'BS0', JSON.stringify(["Viki Koste"]), 'viki@koste.com', 1);
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



            
            
            channelName = "channel1";
            chaincodeName = 'basic';
            ccp = null;
            walletPath = null;
            org1UserId = "TA";
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
            await gateway.connect(ccp, {
                wallet,
                identity: org1UserId,
                discovery: { enabled: true, asLocalhost: true }
            });
            network = await gateway.getNetwork(channelName);
            contract = network.getContract(chaincodeName);


            // reserveSeats tests
            passed += await test7(contract, ++numOfTests);   //create reservation
            passed += await test8(contract, ++numOfTests);   //wrong organization calling function
            passed += await test9(contract, ++numOfTests);   //number of seats is not matching number of names



            org1UserId = "TA";
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
            await gateway.connect(ccp, {
                wallet,
                identity: org1UserId,
                discovery: { enabled: true, asLocalhost: true }
            });
            network = await gateway.getNetwork(channelName);
            contract = network.getContract(chaincodeName);


            // bookSeats tests
            passed += await test10(contract, ++numOfTests);   //book some seats

            // check in tests
            passed += await test11(contract, ++numOfTests);   //try check in

            console.log('\n...................................................');
            console.log('\n' + `OVERALL TESTS RESULT: ${passed}/${numOfTests}`);
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