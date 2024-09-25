export type DecomposedRegexPart = {
  is_public: boolean;
  regex_def: string;
};

export type DecomposedRegex = {
  parts: DecomposedRegexPart[];
  name: string;
  maxLength: number;
  location: 'body' | 'header';
};

// All fields from frontend
export type MetaData = {
  title: string;
  description?: string;
  slug?: string;
  tags?: string;
  emailQuery?: string;
  useNewSdk?: boolean;
  name: string;
  ignoreBodyHashCheck?: boolean;
  shaPrecomputeSelector?: string;
  emailBodyMaxLength?: number;
  senderDomain?: string;
  dkimSelector?: string;
};

export enum ProvingScheme {
  Circom = 'CIRCOM',
  // Noir
}

export type SubmitOptions = {
  serverUrl: string;
};

export enum ProgressStatus {
  UnInitialized = 'UnInitialized',
  InProgress = 'InProgress',
  Done = 'Done',
  Failed = 'Failed',
}

export type RegexBlueprintProps = {
  decomposedRegexes: DecomposedRegex[];
  metaData: MetaData;
  provingScheme?: ProvingScheme;
  externalInputs?: ExternalInput[];
  revealHeaderFields?: RevealHeaderFields;
  ignoreBodyHashCheck?: boolean;
  enableHeaderMasking?: boolean;
  enableBodyMasking?: boolean;
};

const randomId = 'randomId';

export type ExternalInput = {
  name: string;
  maxLength: number;
};

export type RevealHeaderFields = {
  subject: boolean;
  timestamp: boolean;
  from: boolean;
  to: boolean;
};

/**
 * Represents a Regex Blueprint including the decomposed regex access to the circuit
 * and all its metaData.
 */
export class RegexBlueprint {
  decomposedRegexes: DecomposedRegex[];
  metaData: MetaData;
  provingScheme?: ProvingScheme;
  externalInputs?: ExternalInput[];
  revealHeaderFields: RevealHeaderFields;

  // Variables set after submitting
  id?: string;
  verifierContractAddress?: string;
  status: ProgressStatus = ProgressStatus.UnInitialized;
  ignoreBodyHashCheck: boolean;
  enableHeaderMasking: boolean;
  enableBodyMasking: boolean;

  constructor({
    decomposedRegexes,
    metaData,
    revealHeaderFields = {
      subject: false,
      timestamp: false,
      from: false,
      to: false,
    },
    // Add {subject: boolean, timestamp: boolean, from: boolean, to: boolean}
    // --> Additional item in decomposedRegex --> copy from website
    // revealHeaderFields,
    provingScheme,
    externalInputs,
    ignoreBodyHashCheck = false,
    enableHeaderMasking = false,
    enableBodyMasking = false,
  }: RegexBlueprintProps) {
    this.decomposedRegexes = decomposedRegexes;
    this.metaData = metaData;
    this.provingScheme = provingScheme || ProvingScheme.Circom;
    this.status = ProgressStatus.UnInitialized;
    this.revealHeaderFields = revealHeaderFields;
    this.ignoreBodyHashCheck = ignoreBodyHashCheck ?? false;
    this.enableHeaderMasking = enableHeaderMasking;
    this.enableBodyMasking = enableBodyMasking;
  }

  /**
   * Fetches an existing RegexBlueprint from the database.
   * @param {string} id - Id of the RegexBlueprint.
   * @returns A promise that resolves to a new instance of RegexBlueprint.
   */
  public static async getBlueprintById(id: string): Promise<RegexBlueprint> {
    const regexBlueprint = new RegexBlueprint({
      decomposedRegex: {
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
      },
      metaData: {
        name: 'Email',
        description: 'Test blueprint for email.',
      },
      provingScheme: ProvingScheme.Circom,
    });
    await regexBlueprint.submit();
    return regexBlueprint;
  }

  /**
   * Submits a new RegexBlueprint to the registry. This will:
   * 1. Create and save a new circuit.
   * 2. Deploy a verifier on chain.
   * 3. Save the circuit and infomation about the verifier contract to the registry.
   * @param {SubmitOptions} options: SubmitOptions. Optional.
   * @returns {Promise<void>} A promise. Once it resolves, `getVerifierContractAddress` and `getId`
   * can be called on the class instance.
   */
  public async submit(options?: SubmitOptions) {
    await new Promise((r) => setTimeout(r, 3_000));
    this.id = randomId;
    this.verifierContractAddress = '0x0';
    this.status = ProgressStatus.Done;
  }

  /**
   * Submits a new RegexBlueprint request to the registry. This will initiate the submit flow
   * and set the `progressStatus` to `InProgress`. You can then check the progress with
   * `checkStatus`, it will be set to `Done` once the request is processed.
   * 1. Create and save a new circuit.
   * 2. Deploy a verifier on chain.
   * 3. Save the circuit and infomation about the verifier contract to the registry.
   * @param {SubmitOptions} options: SubmitOptions Optional.
   * @returns {Promise<void>} A promise. Once `checkStatus()` returns `Done`,
   * `getVerifierContractAddress` and `getId` can be called on the class instance.
   */
  public async submitRequest(options?: SubmitOptions): Promise<string> {
    setTimeout(() => {
      this.id = randomId;
      this.verifierContractAddress = '0x0';
      this.status = ProgressStatus.Done;
    }, 3_000);
    return randomId;
  }

  checkStatus(): ProgressStatus {
    return this.status;
  }

  getDecomposedRegex(): DecomposedRegex {
    return this.decomposedRegex;
  }

  getMetaData(): MetaData {
    return this.metaData;
  }

  getProvingScheme(): ProvingScheme {
    return this.provingScheme;
  }

  getId(): string {
    if (this.status !== ProgressStatus.Done) {
      throw new Error(
        `RegexBlueprint is not ready and has status ${this.status}`,
      );
    }
    return this.id!;
  }

  getVerifierContractAddress(): string {
    if (this.status !== ProgressStatus.Done) {
      throw new Error(
        `RegexBlueprint is not ready and has status ${this.status}`,
      );
    }
    return this.verifierContractAddress!;
  }

  // getCircuit() {
  // }
}
