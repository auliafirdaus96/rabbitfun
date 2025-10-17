const fs = require('fs');
const path = require('path');

function generateTestTemplate(contractName, testName) {
  const template = `import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";

// Import types
import { ${contractName} } from "../../client/src/types/contracts";

describe("${testName}", function () {
  let ${contractName.toLowerCase()}: ${contractName};
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let treasury: SignerWithAddress;

  beforeEach(async function () {
    [owner, user, treasury] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("${contractName}");
    ${contractName.toLowerCase()} = await Factory.deploy(
      await treasury.getAddress()
    );
    await ${contractName.toLowerCase()}.waitForDeployment();
  });

  describe("Basic functionality", function () {
    it("Should deploy successfully", async function () {
      expect(${contractName.toLowerCase()}.target).to.not.be.undefined;
    });

    it("Should have correct owner", async function () {
      const contractOwner = await ${contractName.toLowerCase()}.owner();
      expect(contractOwner).to.equal(await owner.getAddress());
    });
  });

  // Add more test cases here...

});
`;

  return template;
}

// Example usage:
// generateTestTemplate("RabbitLaunchpad", "RabbitLaunchpad - Basic Tests");

module.exports = { generateTestTemplate };