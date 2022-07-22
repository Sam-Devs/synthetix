const fs = require('fs');
const hre = require('hardhat');

const path = require('path');

const synthetix = require('..');

const commands = {
	build: require('./src/commands/build').build,
	deploy: require('./src/commands/deploy').deploy,
	prepareDeploy: require('./src/commands/prepare-deploy').prepareDeploy,
	connectBridge: require('./src/commands/connect-bridge').connectBridge,
};

async function prepareDeploy(...args) {
	await commands.prepareDeploy(...args);
}

async function deployInstance({
	addNewSynths,
	buildPath,
	signer,
	freshDeploy,
	generateSolidity = false,
	ignoreCustomParameters = false,
	network,
	skipFeedChecks = true,
	useFork = false,
	useOvm,
	provider,
}) {
	await commands.deploy({
		addNewSynths,
		buildPath,
		concurrency: 1,
		freshDeploy: freshDeploy,
		generateSolidity,
		ignoreCustomParameters,
		network,
		signer: signer,
		skipFeedChecks,
		useFork,
		useOvm,
		provider,
		maxFeePerGas: 1,
		maxPriorityFeePerGas: 1,
		yes: true,
	});
}

async function deploy(runtime, networkVariant) {
	if (
		networkVariant !== 'local' &&
		networkVariant !== 'local-ovm' &&
		networkVariant !== hre.network.name
	) {
		throw new Error(
			`Wrong network: set to "${networkVariant}". It should be "${hre.network.name}".`
		);
	}

	let network = networkVariant;
	let useOvm = false;
	if (networkVariant.endsWith('-ovm')) {
		useOvm = true;
		network = networkVariant.slice(0, networkVariant.length - 4);
	}
	const buildPath = path.join(__dirname, '..', synthetix.constants.BUILD_FOLDER);

	// prepare the synths but skip preparing releases (as this isn't a fork)
	const synthsToAdd = [];

	await prepareDeploy({ network, synthsToAdd, useOvm, useReleases: false, useSips: false });
	await deployInstance({
		addNewSynths: true,
		buildPath,
		useOvm,
		network,
		freshDeploy: networkVariant.startsWith('local'),
		provider: runtime.provider,
		signer: await runtime.getDefaultSigner({}),
	});

	// pull deployed contract information

	const allTargets = synthetix.getTarget({ fs, path, network, useOvm });

	const contracts = {};
	Object.entries(allTargets).map(([name, target]) => {
		contracts[name] = {
			address: target.address,
			abi: synthetix.getSource({ fs, path, network, useOvm, contract: target.source }).abi,
			deployTxn: target.txn,
		};
	});

	return { contracts };
}

if (module === require.main) {
	deploy();
}

module.exports = {
	deploy,
};