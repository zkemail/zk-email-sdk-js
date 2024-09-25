import {
  createRegexBlueprint,
  getRegexBlueprint,
  createProver,
} from '../mock-sdk';
import { DecomposedRegex, MetaData } from '../regex-blueprint';

async function newBlueprint() {
  try {
    const decomposedRegex: DecomposedRegex = {
      parts: [
        {
          is_public: false,
          regex_def: 'email was meant for @',
        },
        {
          is_public: true,
          regex_def: '(a-zA-Z0-9_)+',
        },
      ],
    };

    const metaData: MetaData = {
      title: 'Email',
      name: 'Email',
      description: 'Test blueprint for email.',
    };

    console.log('creating regex blueprint');
    const blueprint = createRegexBlueprint({
      decomposedRegex,
      metaData,
    });

    // console.log('submitting blueprint');
    await blueprint.submit();

    console.log('creating prover');
    const proover = createProver({
      isLocal: false,
      url: 'https://prover.email',
    });

    console.log('generating proof');
    const proof = proover.generateProof(blueprint.getId(), 'data to proove');
    console.log('proof.checkStatus()', proof.checkStatus());

    console.log('getting proofData');
    const proofData = await proof.getProofData();
    console.log('proof.checkStatus()', proof.checkStatus());
    console.log('proofData: ', proofData.toString());

    console.log('verifying proof on chain');
    proof.verifyProofOnChain();
    console.log('done');
  } catch (err) {
    console.error('Unknown error: ', err);
  }
}

newBlueprint();

// function existingProof() {
//   const blueprint = getRegexBlueprint(id);
//   const proover = createProver();
//   const proof = proover.generateProof(blueprint.getId(), dataToProve);
// }
