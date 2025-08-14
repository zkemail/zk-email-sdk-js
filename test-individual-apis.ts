#!/usr/bin/env bun

import { BlueprintCollection } from "./src/blueprintCollection";
import { Auth } from "./src/types/auth";

const baseUrl = "http://localhost:8080";
const auth: Auth = {
  getToken: async () => "zkemail",
  onTokenExpired: async () => {}
};

async function testIndividualAPIs() {
  console.log("🧪 Testing Individual APIs...\n");

  try {
    // Test 1: List Collections
    console.log("1️⃣ Testing GET /blueprint-collection (list collections)");
    const collections = await BlueprintCollection.listBlueprintCollections(baseUrl);
    console.log(`   ✅ Found ${collections.length} collections`);
    if (collections.length > 0) {
      console.log(`   📋 First collection: ${collections[0].getTitle()}`);
    }
    console.log("");

    // Test 2: Create Collection
    console.log("2️⃣ Testing POST /blueprint-collection (create collection)");
    const createProps = {
      title: `Test Collection ${Date.now()}`,
      description: "Testing individual API creation",
      slug: `test-api-${Date.now()}`,
      tags: ["test", "api", "individual"],
      isPublic: true,
      blueprintIds: ["05611b31-0d46-4c17-a762-68f9a01d7913", "1125c08c-07d5-4791-8d0c-25b60386c24e"]
    };
    
    const newCollection = await BlueprintCollection.createBlueprintCollection(
      createProps,
      baseUrl,
      auth
    );
    console.log(`   ✅ Created collection: ${newCollection.getId()}`);
    console.log(`   📋 Title: ${newCollection.getTitle()}`);
    console.log("");

    // Test 3: Get Collection by ID
    console.log("3️⃣ Testing GET /blueprint-collection/:id (get by ID)");
    const fetchedCollection = await BlueprintCollection.getBlueprintCollectionById(
      newCollection.getId()!,
      baseUrl
    );
    console.log(`   ✅ Fetched collection: ${fetchedCollection.getTitle()}`);
    console.log("");

    // Test 4: Update Collection
    console.log("4️⃣ Testing PATCH /blueprint-collection/:id (update collection)");
    const updatedCollection = await BlueprintCollection.updateBlueprintCollection(
      newCollection.getId()!,
      { title: "Updated Title", description: "Updated description" },
      baseUrl,
      auth
    );
    console.log(`   ✅ Updated collection: ${updatedCollection.getTitle()}`);
    console.log(`   📋 New description: ${updatedCollection.getDescription()}`);
    console.log("");

    // Test 5: Delete Collection
    console.log("5️⃣ Testing DELETE /blueprint-collection/:id (delete collection)");
    await BlueprintCollection.deleteBlueprintCollection(
      newCollection.getId()!,
      baseUrl,
      auth
    );
    console.log(`   ✅ Deleted collection: ${newCollection.getId()}`);
    console.log("");

    console.log("🎉 All individual API tests passed!");

  } catch (error) {
    console.error("❌ API test failed:", error);
  }
}

// Run the tests
testIndividualAPIs(); 