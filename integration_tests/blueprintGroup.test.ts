import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Blueprint, BlueprintProps, ZkFramework, initZkEmailSdk } from "../src";
import { BlueprintGroupProps } from "../src/types/blueprintGroup";

const sdk = initZkEmailSdk({
  auth: {
    getToken: async () =>
    "",
    onTokenExpired: async () => {},
  },
  // baseUrl: "https://dev-conductor.zk.email",
  baseUrl: "http://127.0.0.1:8080",
});


describe("BlueprintGroup test suite", () => {
  test("Full CRUD flow", async () => {
    // Create blueprintGroup
    let props: BlueprintGroupProps = {
      name: "Amazon Orders",
      description: "Emails to reveal the order number of a amazon order",
      blueprintIds: ["4cfc3efd-7215-4e96-9b4e-291d2a9cc702"],
      blueprintSlugs: ["rutefig/Amazon_UK_Account_0@v1"]
    }
    let blueprintGroup = sdk.createBlueprintGroup(props)
    await blueprintGroup.save();
    expect(blueprintGroup.props.id).toBeDefined();
    
    // Get blueprintGroup
    const id = blueprintGroup.props.id!;
    blueprintGroup = await sdk.getBlueprintGroupById(id);
    expect(blueprintGroup.props.id).toBe(id);
    
    // Update blueprintGroup
    props = {
      name: "Amazon Orders",
      description: "Emails to reveal the order number of a amazon order",
      blueprintIds: ["4cfc3efd-7215-4e96-9b4e-291d2a9cc702", "5d0cee90-7805-4052-8eb9-6c71bc969806"],
      blueprintSlugs: ["rutefig/Amazon_UK_Account_0@v1", "moven0831/XuedaoZkInLife@v2"]
    }
    await blueprintGroup.update(props);
    expect(blueprintGroup.props.blueprintIds?.length).toBe(2);
    expect(blueprintGroup.props.blueprintSlugs?.length).toBe(2);
    expect(blueprintGroup.props.blueprintIds![1]).toBe("5d0cee90-7805-4052-8eb9-6c71bc969806");
    expect(blueprintGroup.props.blueprintSlugs![1]).toBe("moven0831/XuedaoZkInLife@v2");
    
    // Fetch blueprints
    await blueprintGroup.fetchBlueptrints();
    expect(blueprintGroup.blueprints.length).toBe(4);
    expect(blueprintGroup.blueprints[0]).toBeInstanceOf(Blueprint);
    
    // Delete blueptintGroup
    await blueprintGroup.delete();
    try {
      await sdk.getBlueprintGroupById(id);
      throw new Error("getBlueprintGroupById succeeded after delete");
    } catch (err) {
      expect(err).toBeDefined();
    }
  }, 60_000)
})
