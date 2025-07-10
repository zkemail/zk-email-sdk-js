import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import zkeSdk from "../src";

const sdk = zkeSdk({
  baseUrl: "https://staging-conductor.zk.email",
  auth: {
    getToken: async () =>
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTI4MTg5MjUsImdpdGh1Yl91c2VybmFtZSI6IkRpbWlEdW1vIn0.72CrX3j0A2f3ZGZM5Ca6GnXo3_xRceryn_KsOTH8gW4",
    onTokenExpired: async () => {},
  },
});

describe("Submit a blueprint", () => {
  test("Submit", async () => {
    const blueprint = await sdk.getBlueprintById("ae989ffd-0586-49d5-bf8d-235bef5f7d39");
    await blueprint.submit();
    console.log("submitted");
  });
});

// const bla = [{"name":"invoice_date","parts":[{"regex_def":"INVOICE DATE<\/span><br>\s*"},{"is_public":true,"regex_def":"\d{1,2}"},{"regex_def":"\s+"},{"is_public":true,"regex_def":"\w{3}"},{"regex_def":"\s+"},{"is_public":true,"regex_def":"\d{4}"}],"location":"body","max_length":9}]
