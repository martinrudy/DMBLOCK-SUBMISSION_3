const path = require('path');
const fs = require('fs');
const prompt = require('prompt-sync')();

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const adminUserId = 'admin';
const adminUserPasswd = 'adminpw';

// Inpiration from fabric-samples
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

		// Register the user, enroll the user, and import the new identity into the wallet.
		// if affiliation is specified by client, the affiliation value must be configured in CA
		const secret = await caClient.register({
			affiliation: affiliation,
			enrollmentID: userId,
			role: 'client'
		}, adminUser);
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

// Inpiration from fabric-samples
async function main () {

    while(1){
        console.log("****What's your ID?****");
        console.log("=========================================================")
        console.log("****For travel agency type: TA (GladlyAbroad)****")
        console.log("****For customer type: CU (Customer)****")
        console.log("****For airlines type: EC (EconFly) or BS (BusiFly)****");
        console.log("=========================================================")
        let org1UserId = prompt("====>Choose your ID: ");
        let channelName = prompt("====>Please type your channel name: ");
        console.log("=========================================================")
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
            break;
        }
        const caClient = buildCAClient(FabricCAServices, ccp, `ca.org${org}.example.com`);
        const wallet = await buildWallet(Wallets, walletPath);
        await enrollAdmin(caClient, wallet, `Org${org}MSP`);
        await registerAndEnrollUser(caClient, wallet, `Org${org}MSP`, org1UserId, `org${org}.department1`);
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: org1UserId,
            discovery: { enabled: true, asLocalhost: true }
        });
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        console.log("You logged as "+org1UserId);
        //console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
		await contract.submitTransaction('InitLedger');
	    //console.log('*** Result: committed');
        
        while(1){
            console.log("Choose what to do");
            let answer;
            let result;
            if(organization === 'Airline' || organization === 'TravelAgency' || organization === 'Customer'){
                console.log("====================================")
                console.log("====>Press 1 to GET ALL flights<====");
                console.log("====>Press 2 to CREATE a flight<====");
                console.log("====>Press 3 to GET the flight <====");
                console.log("====>Press 4 to BOOK seats     <====");
                console.log("====>Press 5 to RESERVE seats  <====");
                console.log("====>Press 6 to CHECK in       <====");
                console.log("====>Press 7 to Get rezervation<====");
                console.log("====>Press 0 to EXIT           <====");
                console.log("====================================")
                answer = prompt("Your choice: ");
                console.log("====================================")
                if(answer == 1){
                    try{
                        console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current flights on the ledger');
                        result = await contract.evaluateTransaction('getAllFlights');
                        console.log(`*** Result: ${prettyJSONString(result.toString())}`);
                    }catch(error){
                        console.error(`******** FAILED to run the application: ${error}`);
                    }
                }
                else if(answer == 2){
                    try{
                        console.log("====>Creating new flight<====");
                        let from = prompt("From: ");
                        let to = prompt("To: ");
                        let datetime = prompt("DateTime: ");
                        let seatsNum = prompt("Number of seats: ");
                        console.log('\n--> Submit Transaction: createFlight');
                        let result = await contract.submitTransaction('createFlight', from, to, datetime, parseInt(seatsNum), org1UserId);
                        console.log('*** Result: committed');
                        if (`${result}` !== '') {
                            result = JSON.parse(result.toString());
                            console.log(`*** Flight FROM:${result.flyFrom} TO:${result.flyTo} on date ${result.dateTime} with ${result.availablePlaces} seats was created with Flight Number ${result.flightNr}`);
                        }
                        console.log('');
                    }catch(error){
                        console.error(`******** FAILED to run the application: ${error}`);
                    }
                }
                else if(answer == 3){
                    try{
                        console.log("=======>Get the flight<=======");
                        let flightId = prompt("Please type the flight ID: ");
                        console.log('\n--> Evaluate Transaction: getFlight, function returns all the current assets on the ledger');
                        result = await contract.evaluateTransaction('getFlight', flightId);
                        result = JSON.parse(result.toString())
                        console.log(`*** Result: ${typeof result.availablePlaces}`);
                    }catch(error){
                        console.error(`******** FAILED to run the application: ${error}`);
                    }
                }
                else if(answer == 4){
                    try{
                        console.log("=======>Book seats<=======");
                        let reservationNr = prompt("Please type the reservation ID: ");
                        console.log('\n--> Submit Transaction: bookSeats ');
                        result = await contract.submitTransaction( 'bookSeats', reservationNr, org1UserId);
                        console.log('*** Result: committed');
                        if (`${result}` !== '') {
                            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
                        }
                    }catch(error){
                        console.error(`******** FAILED to run the application: ${error}`);
                    }
                }
                else if(answer == 5){
                    try{
                        let names = [];
                        console.log("=======>Reserve seats<=======");
                        let flightNum = prompt("Flight number: ");
                        let email = prompt("Where to send flying tickets (email): ");
                        let number = prompt("Number of seats to reserve: ");
                        for(let i = 1; i <= number; i++){
                            let name = prompt(`Name passanger ${i}: `);
                            names.push(name);
                        }
                        console.log('\n--> Submit Transaction: reserveSeats ');
                        result = await contract.submitTransaction( 'reserveSeats', flightNum, names, email, parseInt(number));
                        console.log('*** Result: committed');
                        result = JSON.parse(result.toString());
                        if (`${result}` !== '') {
                            console.log(`*** Reservation number ${result.reservationNr} was created, your flying tickets will be send to ${result.customerEmail}`);
                        }
                    }catch(error){
                        console.error(`******** FAILED to run the application: ${error}`);
                    }
                }
                else if(answer == 6){
                    try{
                        let infos = []
                        console.log("=========>Check in<=========");
                        let reservationNr = prompt("Please type the reservation number: ")
                        let resv = JSON.parse((await contract.evaluateTransaction('getReservation', reservationNr)).toString());
                        for(let i = 1; i <= resv.nrOfSeats; i++){
                            let cusName = prompt(`Please type the name of passanger ${i}: `);
                            let passport = prompt(`Please type the passport number of passanger ${i}: `);
                            let info = {
                                "cusName": cusName,
                                "passport": passport
                            };
                            infos.push(info);
                        }
                        console.log('\n--> Evaluate Transaction: checkIn');
                        result = await contract.evaluateTransaction('checkIn', reservationNr, infos);
                        console.log(`*** Result: ${result}`);
                    }
                    catch(error){
                        console.error(`******** FAILED to run the application: ${error}`);
                    }
                }
                else if(answer == 7){
                    try{
                        console.log("=========>Get rezervation<=========");
                        let reservationNr = prompt("Please type the reservation number: ")
                        console.log('\n--> Evaluate Transaction: getReservation');
			            result = await contract.evaluateTransaction('getReservation', reservationNr);
			            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
                    }
                    catch(error){
                        console.error(`******** FAILED to run the application: ${error}`);
                    }
                }
                else if(answer == 0){
                    break;
                }
            }     
        }
        gateway.disconnect();
    }
}




main();