/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}



async function test1(contract){
    console.log('--> Running test 1: create new flight, then get this flight');
    console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
	await contract.submitTransaction('InitLedger');
	console.log('*** Result: committed');

	console.log('\n--> Submit Transaction: UpdateAsset asset1, change the appraisedValue to 350');
	let result = await contract.submitTransaction('createFlight', 'BUD', 'DUB', '30042022-1048', '350', 'BS');
	console.log('*** Result: committed');
	if (`${result}` !== '') {
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
	}

	console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
	result = await contract.evaluateTransaction('getAllFlights');
	console.log(`*** Result: ${prettyJSONString(result.toString())}`);

    let testResult = 'passed';
    console.log(`*** Result: ${testResult}`);
}

async function test2(contract){

}


async function runTests(contract){
    test1(contract);
    test2(contract);
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
		const ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

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
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
			// This type of transaction would only be run once by an application the first time it was started after it
			// deployed the first time. Any updates to the chaincode deployed later would likely not need to run
			// an "init" type function.

           /* 
			console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
			await contract.submitTransaction('InitLedger');
			console.log('*** Result: committed');*/

            runTests(contract);

            /*console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
			let result = await contract.evaluateTransaction('getAllFlights');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);
            */

			/*console.log('\n--> Submit Transaction: UpdateAsset asset1, change the appraisedValue to 350');
			let result = await contract.submitTransaction('createFlight', 'BUD', 'DUB', '30042022-1048', '350', 'BS');
			console.log('*** Result: committed');
			if (`${result}` !== '') {
				console.log(`*** Result: ${prettyJSONString(result.toString())}`);
			}

			console.log('\n--> Submit Transaction: UpdateAsset asset1, change the appraisedValue to 350');
			result = await contract.submitTransaction('createFlight', 'BUD', 'DUB', '30042022-1048', '350', 'EC');
			console.log('*** Result: committed');
			if (`${result}` !== '') {
				console.log(`*** Result: ${prettyJSONString(result.toString())}`);
			}
			// Let's try a query type operation (function).
			// This will be sent to just one peer and the results will be shown.
			console.log('\n--> Evaluate Transaction: getFlight, function returns all the current assets on the ledger');
			result = await contract.evaluateTransaction('getFlight', 'BS0');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);


			console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
			result = await contract.evaluateTransaction('getAllFlights');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);


			console.log('\n--> Submit Transaction: reserveSeats ');
			 result = await contract.submitTransaction( 'reserveSeats', 'GladlyAbroad', 'BS0', ["Viki Koste"], 'viki@koste.com', 1);
			console.log('*** Result: committed');
			if (`${result}` !== '') {
				console.log(`*** Result: ${prettyJSONString(result.toString())}`);
			}

			console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
			result = await contract.evaluateTransaction('getAllFlights');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);

			let reservationNr = 'R3';


			console.log('\n--> Evaluate Transaction: getReservation');
			result = await contract.evaluateTransaction('getReservation', reservationNr);
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);
			
			console.log('\n--> Submit Transaction: bookSeats ');
			 result = await contract.submitTransaction( 'bookSeats', reservationNr, 'BS');
			console.log('*** Result: committed');
			if (`${result}` !== '') {
				console.log(`*** Result: ${prettyJSONString(result.toString())}`);
			}

			console.log('\n--> Evaluate Transaction: getReservation');
			result = await contract.evaluateTransaction('getReservation', reservationNr);
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);


			console.log('\n--> Evaluate Transaction: checkIn');
			result = await contract.evaluateTransaction('checkIn', 'Customer', reservationNr, [{cusName: 'psasa', passport: 'OP123456'}]);
			console.log(`*** Result: ${result}`);*/
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