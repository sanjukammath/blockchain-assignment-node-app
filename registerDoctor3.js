'use strict';

const { FileSystemWallet, Gateway, X509WalletMixin } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, 'connection-hospital.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

const username = "doctor03"

async function main() {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists(username);
        if (userExists) {
            console.log(`An identity for the user ${username} already exists in the wallet`);
            return;
        }

        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists('admin');
        if (!adminExists) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('Run the enrollAdmin.js application before retrying');
            return;
        }


        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: false } });

        // Get the CA client object from the gateway for interacting with the CA.
        const ca = gateway.getClient().getCertificateAuthority();


        // Register the user, enroll the user, and import the new identity into the wallet.
        const attrs = [{name: 'email', value:'doctor03@hospital.com'},
                    {name:'doctor', value:'true'},
                    {name:'patient', value:'false'},
                    {name:'lab', value:'false'},]
        
        const attr_reqs = [{name: 'email', optional:false }, 
                {name: 'doctor', optional:false }, 
                {name: 'patient', optional:false },
                {name: 'lab', optional:false }
        ]

        const secret = await ca.register({ affiliation: 'hospital', enrollmentID: username, role: 'user', attrs}, adminIdentity);
        const enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret, attr_reqs});
        const userIdentity = X509WalletMixin.createIdentity('HospitalMSP', enrollment.certificate, enrollment.key.toBytes());
        wallet.import(username, userIdentity);
        console.log(`Successfully registered and enrolled admin user ${username} and imported it into the wallet`);

    } catch (error) {
        console.error(`Failed to register user ${username}: ${error}`);
        process.exit(1);
    }
}

main();
