// import zkeSdk from "@zk-email/sdk";
import zkeSdk from "../../src/index";

export function setupProver(element: HTMLElement) {
  const sdk = zkeSdk();

  const proveButton = element.querySelector("button");
  if (proveButton) {
    proveButton.addEventListener("click", async () => {
      try {
        console.log("getting blueprint");
        // const blueprint = await sdk.getBlueprintById("008b5da5-fbda-4445-b7df-6b0c6dde4bb1");
        const blueprint = await sdk.getBlueprintById("230f5428-e1cd-480e-a553-df0c7124bc08");

        console.log("blueprint: ", blueprint);

        const prover = blueprint.createProver();

        const eml = await getEml();

        const isValidEml = await blueprint.validateEmail(eml!);

        console.log("isValidEml: ", isValidEml);

        // console.log("putting in eml: ", eml);
        const externalInputs = {
          name: "address",
          value: "0x0000",
          maxLength: 44,
        };
        const proof = await prover.generateProof(eml!, [externalInputs]);

        // const proof = await sdk.getProof("b80bc8ff-fb3e-4dbc-9ccb-b47a58b6faf6");

        // console.log("proof done in browser: ", proof);

        const verified = await blueprint.verifyProofData(
          JSON.stringify(proof.props.publicOutputs!),
          JSON.stringify(proof.props.proofData!)
        );

        console.log("Proof verified using strigified data ", verified);

        const verifiedDirect = await blueprint.verifyProof(proof);

        console.log("Proof verified using proof directly: ", verifiedDirect);
      } catch (err) {
        console.error("Failed to prove: ", err);
      }
    });
  }
}

async function getEml() {
  try {
    const response = await fetch("/amazon2.eml"); // URL is relative to the root of the project
    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }
    const data = await response.text(); // Get the content as text
    return data;
  } catch (error) {
    console.error("There has been a problem with your fetch operation:", error);
  }
}

/* Remote
{
    "pi_a": [
        "17063359438686199848059549677080505582175973371540595163512962782152589527169",
        "14748826498616296245994641796708403209064475072317766042674627316946003017489",
        "1"
    ],
    "pi_b": [
        [
            "14348413057689360562398805801953275386049065240834882946282828494774191866218",
            "12929470080078149739318799973573422983706676249600589816502713935921670226371"
        ],
        [
            "15830343317152098976197484682139574834084247828385375182889158022393927550541",
            "17709520091615263615217118215804840639935165573520542298759031804979887650209"
        ],
        [
            "1",
            "0"
        ]
    ],
    "pi_c": [
        "18936002803358335702213624863956407854497826796385672079754635096249591869492",
        "6766062450718229031166483621691960322279623114201212195467535443863379227927",
        "1"
    ],
    "protocol": "groth16"
    }



    [
        "17065011482015124977282970298439631182550457267344513671014250909064553612521",
        "2334392307038315863",
        "0",
        "902461930945294469469049061864238462133168371753019686485682756284276",
        "0",
        "0"
    ]
    */

/*LOCAL
{
    "pi_a": [
        "3946109527236642940110893141288627183516254203777329904148768417522653916334",
        "16198737390051261322724765804253323256226467174549524471445675626756427416426",
        "1"
    ],
    "pi_b": [
        [
            "20047187957479147585944677059351059989110619525470592942347610940888280078707",
            "3338707964462615616440109364623437104625296591775368283175213449152012141951"
        ],
        [
            "11689647619691931254513259870491678813922474804575712935358256625739832521580",
            "16301929682796746758998192804467981570023141091760727529177043786858155055983"
        ],
        [
            "1",
            "0"
        ]
    ],
    "pi_c": [
        "18196242004022942351417351882217404140873162679256310930511286701459954183599",
        "17952721507600032945668554149457354856619683782816798249431089159479173044418",
        "1"
    ],
    "protocol": "groth16",
    "curve": "bn128"
}

[
    "17065011482015124977282970298439631182550457267344513671014250909064553612521",
    "2334392307038315863",
    "0",
    "902461930945294469469049061864238462133168371753019686485682756284276",
    "0",
    "0"
]

*/
