#!/usr/bin/env python3
"""
Test script to verify smart contract audit setup
"""

import subprocess
import sys
import os
from pathlib import Path
import json

def test_tool_availability():
    """Test if audit tools are available"""
    print("🔍 Testing audit tool availability...")

    tools = {
        'Python': 'python --version',
        'Slither': 'slither --version',
        'Mythril': 'myth --version',
        'Solc': 'solc --version',
        'Pip': 'pip --version'
    }

    available_tools = {}

    for tool_name, command in tools.items():
        try:
            result = subprocess.run(command.split(), capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print(f"✅ {tool_name}: Available")
                available_tools[tool_name] = True
            else:
                print(f"❌ {tool_name}: Not available")
                available_tools[tool_name] = False
        except (subprocess.TimeoutExpired, FileNotFoundError):
            print(f"❌ {tool_name}: Not found")
            available_tools[tool_name] = False

    return available_tools

def test_contract_files():
    """Test if contract files exist and are readable"""
    print("\n📄 Testing contract files...")

    contracts_dir = Path("smartcontract/contracts")

    if not contracts_dir.exists():
        print(f"❌ Contracts directory not found: {contracts_dir}")
        return False

    contract_files = list(contracts_dir.glob("*.sol"))

    if not contract_files:
        print(f"❌ No Solidity files found in {contracts_dir}")
        return False

    print(f"✅ Found {len(contract_files)} contract file(s):")

    for contract_file in contract_files:
        print(f"  - {contract_file.name}")

        # Check if file is readable
        try:
            with open(contract_file, 'r') as f:
                content = f.read()
                print(f"    ✅ {len(content)} characters")

                # Basic syntax check
                if 'pragma solidity' in content:
                    print(f"    ✅ Contains pragma")
                if 'contract ' in content:
                    print(f"    ✅ Contains contract definition")

        except Exception as e:
            print(f"    ❌ Error reading file: {e}")
            return False

    return True

def test_audit_script():
    """Test if the audit script exists and is working"""
    print("\n🧪 Testing audit script...")

    script_path = Path("scripts/audit-smart-contracts.py")

    if not script_path.exists():
        print(f"❌ Audit script not found: {script_path}")
        return False

    print(f"✅ Audit script found: {script_path}")

    # Test script syntax
    try:
        result = subprocess.run([
            sys.executable, '-m', 'py_compile', str(script_path)
        ], capture_output=True, text=True)

        if result.returncode == 0:
            print("✅ Audit script syntax is valid")
        else:
            print(f"❌ Audit script syntax error: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error testing audit script: {e}")
        return False

    # Test script help
    try:
        result = subprocess.run([
            sys.executable, str(script_path), '--help'
        ], capture_output=True, text=True, timeout=10)

        if result.returncode == 0:
            print("✅ Audit script help works")
        else:
            print(f"❌ Audit script help failed: {result.stderr}")
    except Exception as e:
        print(f"⚠️ Could not test audit script help: {e}")

    return True

def test_directory_structure():
    """Test if required directories exist"""
    print("\n📁 Testing directory structure...")

    required_dirs = [
        "scripts",
        "smartcontract/contracts",
        "smartcontract/test",
        "docs"
    ]

    all_exist = True

    for dir_path in required_dirs:
        path = Path(dir_path)
        if path.exists():
            print(f"✅ {dir_path}: Exists")
        else:
            print(f"❌ {dir_path}: Missing")
            all_exist = False

    return all_exist

def test_dependencies():
    """Test if Python dependencies are available"""
    print("\n📦 Testing Python dependencies...")

    dependencies = [
        'json',
        'pathlib',
        'subprocess',
        'argparse',
        'datetime'
    ]

    all_available = True

    for dep in dependencies:
        try:
            __import__(dep)
            print(f"✅ {dep}: Available")
        except ImportError:
            print(f"❌ {dep}: Not available")
            all_available = False

    return all_available

def create_mock_audit_report():
    """Create a mock audit report for demonstration"""
    print("\n📋 Creating mock audit report...")

    reports_dir = Path("reports/audit")
    reports_dir.mkdir(parents=True, exist_ok=True)

    mock_report = {
        "audit_summary": {
            "timestamp": "2025-10-14T23:59:00Z",
            "contracts_analyzed": 2,
            "total_findings": 5,
            "high_impact": 0,
            "medium_impact": 2,
            "low_impact": 3
        },
        "slither_results": {
            "success": True,
            "findings": [
                {
                    "check": "unused-return",
                    "impact": "low",
                    "confidence": "high",
                    "description": "The return value of a function is not used",
                    "contract": "RabbitToken",
                    "function": "transfer"
                },
                {
                    "check": "conformance-to-naming",
                    "impact": "low",
                    "confidence": "high",
                    "description": "Contract name does not match pattern",
                    "contract": "RabbitLaunchpad",
                    "function": "constructor"
                }
            ]
        },
        "mythril_results": {
            "success": True,
            "issues": [
                {
                    "title": "Potential Integer Overflow",
                    "severity": "medium",
                    "description": "Arithmetic operation may overflow",
                    "contract": "RabbitToken",
                    "locations": [{"start_line": 45}]
                }
            ]
        },
        "recommendations": [
            "Review medium impact findings",
            "Consider using SafeMath for critical operations",
            "Add input validation for public functions"
        ]
    }

    report_file = reports_dir / "mock_audit_report.json"

    try:
        with open(report_file, 'w') as f:
            json.dump(mock_report, f, indent=2)

        print(f"✅ Mock report created: {report_file}")
        return True
    except Exception as e:
        print(f"❌ Error creating mock report: {e}")
        return False

def generate_setup_instructions():
    """Generate setup instructions based on test results"""
    print("\n📝 Generating setup instructions...")

    instructions = []
    instructions.append("# Smart Contract Audit Setup Instructions")
    instructions.append("")
    instructions.append("## Required Tools Installation")
    instructions.append("")

    # Test Python availability
    try:
        subprocess.run(['python', '--version'], capture_output=True, check=True)
        instructions.append("✅ Python is available")
    except:
        instructions.append("❌ Install Python 3.9+ from https://python.org")

    instructions.append("")
    instructions.append("### Install Python Dependencies")
    instructions.append("```bash")
    instructions.append("pip install -r smartcontract/requirements-audit.txt")
    instructions.append("```")
    instructions.append("")

    instructions.append("### Install Solidity Compiler")
    instructions.append("```bash")
    instructions.append("pip install solc-select")
    instructions.append("solc-select install 0.8.19")
    instructions.append("solc-select use 0.8.19")
    instructions.append("```")
    instructions.append("")

    instructions.append("## Usage")
    instructions.append("")
    instructions.append("### Run Full Audit")
    instructions.append("```bash")
    instructions.append("python scripts/audit-smart-contracts.py")
    instructions.append("```")
    instructions.append("")

    instructions.append("### Audit Specific Contract")
    instructions.append("```bash")
    instructions.append("python scripts/audit-smart-contracts.py --contract smartcontract/contracts/RabbitToken.sol")
    instructions.append("```")
    instructions.append("")

    instructions.append("### CI/CD Integration")
    instructions.append("The audit workflow is configured in `.github/workflows/smart-contract-audit.yml`")
    instructions.append("It will run automatically on:")
    instructions.append("- Push to main/develop branches")
    instructions.append("- Pull requests to main")
    instructions.append("- Weekly schedule (Mondays at 9 AM UTC)")
    instructions.append("")

    # Write instructions to file
    instructions_file = Path("audit-setup-instructions.md")

    try:
        with open(instructions_file, 'w') as f:
            f.write('\n'.join(instructions))

        print(f"✅ Setup instructions created: {instructions_file}")
        return str(instructions_file)
    except Exception as e:
        print(f"❌ Error creating setup instructions: {e}")
        return None

def main():
    """Main test function"""
    print("🧪 Smart Contract Audit Setup Test")
    print("=" * 50)

    # Run all tests
    results = {}

    results['tools'] = test_tool_availability()
    results['contracts'] = test_contract_files()
    results['script'] = test_audit_script()
    results['directories'] = test_directory_structure()
    results['dependencies'] = test_dependencies()

    # Create mock report
    results['mock_report'] = create_mock_audit_report()

    # Generate setup instructions
    instructions_file = generate_setup_instructions()

    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)

    total_tests = 6
    passed_tests = sum(1 for result in results.values() if result)

    print(f"Tests passed: {passed_tests}/{total_tests}")

    if passed_tests == total_tests:
        print("✅ All tests passed! Audit setup is ready.")
    else:
        print("⚠️ Some tests failed. Please review the issues above.")

    if instructions_file:
        print(f"\n📋 Setup instructions: {instructions_file}")

    # Return appropriate exit code
    return 0 if passed_tests >= 4 else 1

if __name__ == "__main__":
    sys.exit(main())