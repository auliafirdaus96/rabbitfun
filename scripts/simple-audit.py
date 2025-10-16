#!/usr/bin/env python3
"""
Simple Smart Contract Audit for Windows compatibility
"""

import os
import sys
import subprocess
from pathlib import Path

def run_simple_audit():
    """Run simple security analysis on contracts"""
    print("Rabbit Launchpad Smart Contract Audit")
    print("=" * 50)

    contracts_dir = Path("smartcontract/contracts")
    if not contracts_dir.exists():
        print("ERROR: Contracts directory not found")
        return

    # Find contract files
    contract_files = list(contracts_dir.glob("*.sol"))
    if not contract_files:
        print("ERROR: No Solidity contracts found")
        return

    print(f"Found {len(contract_files)} contract(s):")
    for contract in contract_files:
        print(f"  - {contract.name}")

    print("\n" + "=" * 50)
    print("MANUAL SECURITY ANALYSIS")
    print("=" * 50)

    for contract_file in contract_files:
        print(f"\nAnalyzing: {contract_file.name}")
        print("-" * 30)

        try:
            with open(contract_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Basic security checks
            checks = []

            # Check for OpenZeppelin imports (good practice)
            if "@openzeppelin/contracts" in content:
                checks.append("✅ Uses OpenZeppelin libraries (Good practice)")

            # Check for pragma solidity
            if "pragma solidity" in content:
                version_line = [line for line in content.split('\n') if 'pragma solidity' in line][0]
                checks.append(f"✅ Solidity version specified: {version_line.strip()}")

            # Check for access control
            if "onlyOwner" in content or "require(msg.sender" in content:
                checks.append("✅ Access control mechanisms found")

            # Check for reentrancy protection
            if "ReentrancyGuard" in content or "nonReentrant" in content:
                checks.append("✅ Reentrancy protection implemented")

            # Check for overflow protection (Solidity 0.8+)
            if "pragma solidity ^0.8" in content:
                checks.append("✅ Uses Solidity 0.8+ (built-in overflow protection)")

            # Check for events
            if "event " in content:
                checks.append("✅ Events defined for transparency")

            # Check for constructor
            if "constructor" in content:
                checks.append("✅ Constructor defined")

            # Potential issues
            if ".call" in content and "require(" not in content:
                checks.append("⚠️ External calls found - manual review recommended")

            if "transfer(" in content or "send(" in content:
                checks.append("⚠️ Legacy transfer functions found - consider using .call")

            # Print results
            for check in checks:
                print(f"  {check}")

            # Basic metrics
            lines = len(content.split('\n'))
            print(f"  📊 Lines of code: {lines}")

            # Count functions
            functions = content.count('function ')
            print(f"  📊 Functions: {functions}")

            # Count contracts
            contracts = content.count('contract ')
            print(f"  📊 Contracts: {contracts}")

        except Exception as e:
            print(f"ERROR reading file: {e}")

    print("\n" + "=" * 50)
    print("SECURITY RECOMMENDATIONS")
    print("=" * 50)

    recommendations = [
        "1. Use Slither for comprehensive static analysis",
        "2. Implement comprehensive input validation",
        "3. Consider using OpenZeppelin security libraries",
        "4. Add emergency stop mechanisms",
        "5. Test for reentrancy attacks",
        "6. Validate all external calls",
        "7. Use proper access controls",
        "8. Add comprehensive event logging"
    ]

    for rec in recommendations:
        print(f"  {rec}")

    print("\n" + "=" * 50)
    print("NEXT STEPS")
    print("=" * 50)

    next_steps = [
        "1. Install Slither: pip install slither-analyzer",
        "2. Run detailed analysis: slither smartcontract/contracts/",
        "3. Review findings and implement fixes",
        "4. Run tests: npm test (in smartcontract directory)",
        "5. Consider professional third-party audit"
    ]

    for step in next_steps:
        print(f"  {step}")

if __name__ == "__main__":
    run_simple_audit()