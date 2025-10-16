# Smart Contract Audit Guide

This guide covers the smart contract audit process using Slither and Mythril for the Rabbit Launchpad project.

## Table of Contents

- [Overview](#overview)
- [Tools Used](#tools-used)
- [Installation](#installation)
- [Running Audits](#running-audits)
- [CI/CD Integration](#cicd-integration)
- [Understanding Results](#understanding-results)
- [Security Best Practices](#security-best-practices)
- [Reporting](#reporting)

## Overview

The Rabbit Launchpad project uses automated smart contract auditing to ensure security and reliability. Our audit process includes:

- **Static Analysis** using Slither for vulnerability detection
- **Symbolic Analysis** using Mythril for deeper security analysis
- **Gas Analysis** for optimization opportunities
- **CI/CD Integration** for continuous security monitoring

## Tools Used

### Slither
Slither is a Solidity static analysis framework that detects:
- Security vulnerabilities
- Gas optimization opportunities
- Code quality issues
- Bug patterns

### Mythril
Mythril is a symbolic analysis tool that detects:
- Integer overflows/underflows
- Reentrancy vulnerabilities
- Access control issues
- Unhandled exceptions

### Additional Tools
- **Semgrep** for general security patterns
- **TruffleHog** for secret detection
- **npm audit** for dependency security

## Installation

### Prerequisites
```bash
# Python 3.9+
python --version

# Node.js 18+
node --version
```

### Install Dependencies
```bash
# Install Python audit tools
pip install -r smartcontract/requirements-audit.txt

# Install Node.js dependencies (in smartcontract directory)
cd smartcontract
npm install
```

### Install Solidity Compiler
```bash
# Install and set specific Solidity version
pip install solc-select
solc-select install 0.8.19
solc-select use 0.8.19
```

## Running Audits

### Quick Start
```bash
# Audit all contracts
python scripts/audit-smart-contracts.py

# Audit specific contract
python scripts/audit-smart-contracts.py --contract smartcontract/contracts/RabbitToken.sol

# Skip Mythril analysis (faster)
python scripts/audit-smart-contracts.py --no-mythril

# Skip gas analysis
python scripts/audit-smart-contracts.py --no-gas
```

### Command Options
```bash
usage: audit-smart-contracts.py [-h] [--contracts-dir CONTRACTS_DIR]
                                [--reports-dir REPORTS_DIR] [--contract CONTRACT]
                                [--no-mythril] [--no-gas] [--install-deps]

Options:
  -h, --help            show this help message and exit
  --contracts-dir CONTRACTS_DIR
                        Directory containing smart contracts
  --reports-dir REPORTS_DIR
                        Directory to save audit reports
  --contract CONTRACT   Specific contract file to audit
  --no-mythril          Skip Mythril analysis
  --no-gas              Skip gas analysis
  --install-deps        Install Python dependencies
```

### Examples

#### Full Audit of All Contracts
```bash
python scripts/audit-smart-contracts.py \
  --contracts-dir smartcontract/contracts \
  --reports-dir reports/audit
```

#### Audit Single Contract with All Analyses
```bash
python scripts/audit-smart-contracts.py \
  --contract smartcontract/contracts/RabbitLaunchpad.sol \
  --reports-dir reports/audit
```

#### Quick Security Check (Slither Only)
```bash
python scripts/audit-smart-contracts.py \
  --no-mythril --no-gas
```

## CI/CD Integration

### GitHub Actions Workflow
The project includes an automated audit workflow that runs on:

- **Push events** to main/develop branches
- **Pull requests** to main branch
- **Weekly schedule** (Mondays at 9 AM UTC)
- **Manual triggers**

### Workflow Features
- ✅ Automated security scans
- ✅ SARIF output for GitHub Security tab
- ✅ PR comments with audit results
- ✅ Artifact storage for reports
- ✅ Multi-tool analysis
- ✅ Coverage reporting

### Manual Workflow Trigger
You can manually trigger the audit workflow:
1. Go to Actions tab in GitHub
2. Select "Smart Contract Audit" workflow
3. Click "Run workflow"
4. Choose options:
   - Specific contract path (optional)
   - Enable/disable Mythril analysis
   - Enable/disable gas analysis

## Understanding Results

### Report Structure
Audit reports are generated in multiple formats:

1. **Comprehensive Report** (`comprehensive_audit_report_*.md`)
   - Executive summary
   - Detailed findings
   - Recommendations
   - Next steps

2. **Slither JSON Report** (`slither_report_*.json`)
   - Raw Slither data
   - Detector details
   - Source mapping

3. **Mythril Reports** (`mythril_report_*.json`)
   - Symbolic analysis results
   - Security issues
   - Attack vectors

4. **Gas Analysis** (`gas_analysis_*.txt`)
   - Function call analysis
   - Optimization opportunities

### Impact Levels

#### High Impact
🚨 **Critical issues requiring immediate attention:**
- Reentrancy vulnerabilities
- Access control bypasses
- Integer overflows/underflows
- Unprotected ether transfers

#### Medium Impact
⚠️ **Important issues to address:**
- Gas optimization opportunities
- Logic errors in edge cases
- Potential front-running attacks

#### Low Impact
💡 **Minor improvements:**
- Code quality issues
- Naming convention violations
- Documentation gaps

#### Informational
ℹ️ **Informational findings:**
- Best practice recommendations
- Optimization suggestions
- Style improvements

### Common Vulnerability Types

#### Reentrancy
```solidity
// Vulnerable
function withdraw(uint amount) public {
    require(balances[msg.sender] >= amount);
    (bool success,) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] -= amount;  // State change after external call
}

// Fixed
function withdraw(uint amount) public {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;  // State change before external call
    (bool success,) = msg.sender.call{value: amount}("");
    require(success);
}
```

#### Integer Overflow/Underflow
```solidity
// Vulnerable (Solidity < 0.8.0)
uint8 balance = 255;
balance += 1;  // Overflow to 0

// Safe (Solidity >= 0.8.0 or SafeMath)
uint8 balance = 255;
balance += 1;  // Reverts on overflow
```

#### Access Control
```solidity
// Vulnerable
function setOwner(address newOwner) public {
    owner = newOwner;  // Anyone can call
}

// Fixed
modifier onlyOwner() {
    require(msg.sender == owner, "Not authorized");
    _;
}

function setOwner(address newOwner) public onlyOwner {
    owner = newOwner;
}
```

## Security Best Practices

### Development Guidelines

#### 1. Use Latest Solidity Version
```solidity
pragma solidity ^0.8.19;  // Use recent stable version
```

#### 2. Implement Access Controls
```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyContract is Ownable {
    function sensitiveFunction() public onlyOwner {
        // Only owner can call
    }
}
```

#### 3. Use Safe Math Operations
```solidity
// Solidity >= 0.8.0 has built-in overflow protection
// For older versions, use SafeMath
using SafeMath for uint256;

function safeAdd(uint a, uint b) public pure returns (uint) {
    return a.add(b);  // Protected against overflow
}
```

#### 4. Check External Calls
```solidity
// Use call for external ether transfers
(bool success, ) = recipient.call{value: amount}("");
require(success, "Transfer failed");

// Avoid this pattern:
recipient.transfer(amount);  // Can fail silently
```

#### 5. Implement Reentrancy Guards
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MyContract is ReentrancyGuard {
    mapping(address => uint) balances;

    function withdraw() public nonReentrant {
        uint amount = balances[msg.sender];
        balances[msg.sender] = 0;
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

### Testing Guidelines

#### 1. Comprehensive Test Coverage
```javascript
// Test all functions
describe("MyContract", function() {
    // Test happy paths
    it("should work correctly", async function() {
        // Normal operation test
    });

    // Test edge cases
    it("should handle edge cases", async function() {
        // Boundary conditions
    });

    // Test security scenarios
    it("should prevent attacks", async function() {
        // Reentrancy, overflow, etc.
    });
});
```

#### 2. Gas Testing
```javascript
// Include gas usage analysis
it("should use reasonable gas", async function() {
    const tx = await myContract.myFunction();
    const receipt = await tx.wait();
    console.log("Gas used:", receipt.gasUsed.toString());
});
```

## Reporting

### Report Locations
- **CI/CD Reports**: GitHub Actions artifacts
- **Local Reports**: `reports/audit/` directory
- **Security Tab**: GitHub repository Security tab (SARIF)

### Report Templates

#### Vulnerability Report Template
```markdown
## Security Finding: [Title]

### Severity
[Critical/High/Medium/Low]

### Description
[Detailed description of the vulnerability]

### Location
- **Contract**: ContractName.sol
- **Function**: functionName()
- **Line**: [Line number]

### Proof of Concept
[Code or steps to reproduce]

### Impact
[Explanation of potential impact]

### Recommendation
[How to fix the issue]

### References
[Links to relevant documentation or similar vulnerabilities]
```

### Notification Templates

#### Slack/Discord Notification
```
🦊 Smart Contract Audit Alert

📊 Audit Summary:
- High Issues: X
- Medium Issues: Y
- Low Issues: Z

🔗 View Report: [Link to detailed report]

📝 Next Steps:
1. Review critical findings
2. Implement fixes
3. Re-run audit
```

## Troubleshooting

### Common Issues

#### Slither Installation Fails
```bash
# Try installing specific version
pip install slither-analyzer==0.10.1

# Install from source
pip install git+https://github.com/crytic/slither.git
```

#### Mythril Analysis Timeout
```bash
# Increase timeout or disable for large contracts
python scripts/audit-smart-contracts.py --no-mythril

# Or analyze specific contracts only
python scripts/audit-smart-contracts.py --contract path/to/contract.sol
```

#### Solidity Version Mismatch
```bash
# Set correct Solidity version
solc-select install 0.8.19
solc-select use 0.8.19

# Or check pragma in contract
pragma solidity ^0.8.19;
```

#### Memory Issues
```bash
# Close other applications
# Or use smaller analysis scope
python scripts/audit-smart-contracts.py --contract specific_contract.sol
```

### Getting Help

1. **Check Logs**: Review console output for error messages
2. **Review Reports**: Check generated report files for partial results
3. **Documentation**: Consult tool-specific documentation
4. **Community**: Seek help in relevant forums or Discord channels

## Continuous Improvement

### Regular Tasks
- [ ] Review audit findings regularly
- [ ] Update dependencies
- [ ] Run tests before commits
- [ ] Monitor new vulnerability patterns
- [ ] Maintain audit documentation

### Enhancement Ideas
- Add more static analysis tools
- Implement custom security detectors
- Create automated fix suggestions
- Integrate with security monitoring services
- Add gas optimization recommendations

## References

- [Slither Documentation](https://github.com/crytic/slither)
- [Mythril Documentation](https://github.com/ConsenSys/mythril)
- [Solidity Security Considerations](https://docs.soliditylang.org/en/latest/security-considerations.html)
- [OpenZeppelin Security Best Practices](https://docs.openzeppelin.com/contracts/4.x/security)
- [ConsenSys Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)

---

*This audit framework is part of Rabbit Launchpad's commitment to security and reliability. Regular audits and continuous monitoring help ensure the safety of user funds and the integrity of the platform.*