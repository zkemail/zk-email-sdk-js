import { ProgressStatus } from './regex-blueprint';

export type ProverParams = {
  isLocal: boolean;
  url?: string;
};

/**
 * Represents a prover that can generate a proof.
 */
export class Prover {
  private isLocal: boolean;
  private url?: string;

  constructor({ isLocal, url }: ProverParams) {
    this.isLocal = isLocal;
    this.url = url;
  }

  /**
   * Generates a Proof.
   * @param {string | Buffer} input - The input to be proven.
   * @param {string} blueprintId - The id of the blueprint. The circuit of this blueprint will be
   * used in the prover.
   * @returns A promise that resolves to a new instance of a Proof.
   */
  generateProof(input: string | Buffer, blueprintId: string): Proof {
    return new Proof({
      isLocal: true,
      blueprintId,
    });
  }
}

export type ProofParams = {
  isLocal: boolean;
  blueprintId: string;
  request?: Promise<Buffer>;
  id?: string;
  proofData?: Buffer;
};

/**
 * Represents the actual proof, that can also be verified on chain.
 */
export class Proof {
  private blueprintId: string;
  private id: string | null;
  private status: ProgressStatus;
  private isLocal: boolean;

  private request?: Promise<Buffer>;
  private proofData?: Buffer;

  constructor({ isLocal, blueprintId, request, id, proofData }: ProofParams) {
    this.isLocal = isLocal;
    if (this.isLocal) {
      if (!proofData) {
        throw Error('For a local proof you must provide the proof data.');
      }
      this.status = ProgressStatus.Done;
      this.id = null;
    } else {
      if (!request || !id) {
        throw Error(
          'For a remote proof you must provide the request that will resolve to the proof data and its id.',
        );
      }
      this.request = request;
      this.id = id;
      this.status = ProgressStatus.InProgress;

      this.request
        .then((proofData) => {
          this.proofData = proofData;
          this.status = ProgressStatus.Done;
        })
        .catch((err) => {
          this.status = ProgressStatus.Failed;
          console.error(`Failed to get proof Data: ${err}`);
        });
    }
    this.blueprintId = blueprintId;
  }

  async getProofData(): Promise<Buffer> {
    if (this.isLocal) {
      return this.proofData!;
    } else {
      return this.request!;
    }
  }

  checkStatus(id: string): ProgressStatus {
    return this.status;
  }

  /**
   * Submits a new Proof request. This will initiate the proover and set the `progressStatus`
   * to `InProgress`. You can then check the progress with `checkStatus`, it will be set to `Done`
   * once the request is processed.
   * @param {string | Buffer} input - The input to be proven.
   * @param {string} blueprintId - The id of the blueprint. The circuit of this blueprint will be
   * used in the prover.
   * @returns A promise that resolves to a new instance of a Proof.
   */
  getId(input: string | Buffer, blueprintId: string): string | null {
    return this.id;
  }

  async verifyProofOnChain(): Promise<boolean> {
    return true;
  }
}
