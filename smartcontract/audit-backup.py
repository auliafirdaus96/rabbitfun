#!/usr/bin/env python3
"""
Rabbit Launchpad Smart Contract Audit Script
Uses Slither and Mythril for comprehensive security analysis
"""

import os
import sys
import json
import subprocess
import argparse
import datetime
from pathlib import Path
from typing import List, Dict, Any
import re

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    NC = '\033[0m'  # No Color

class SmartContractAuditor:
    def __init__(self, contracts_dir: str = "smartcontract/contracts",
                 reports_dir: str = "reports/audit"):
        self.contracts_dir = Path(contracts_dir)
        self.reports_dir = Path(reports_dir)
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        self.timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    def log(self, message: str, color: str = Colors.WHITE):
        """Print colored log message"""
        print(f"{color}[AUDIT] {message}{Colors.NC}")

    def log_error(self, message: str):
        """Print error message"""
        print(f"{Colors.RED}[ERROR] {message}{Colors.NC}")

    def log_success(self, message: str):
        """Print success message"""
        print(f"{Colors.GREEN}[SUCCESS] {message}{Colors.NC}")

    def log_warning(self, message: str):
        """Print warning message"""
        print(f"{Colors.YELLOW}[WARNING] {message}{Colors.NC}")

    def log_info(self, message: str):
        """Print info message"""
        print(f"{Colors.BLUE}[INFO] {message}{Colors.NC}")

    def check_prerequisites(self) -> bool:
        """Check if required tools are installed"""
        self.log("Checking prerequisites...")

        tools = {
            'slither': 'slither',
            'myth': 'myth',
            'solc': 'solc'
        }

        missing_tools = []

        for tool_name, command in tools.items():
            try:
                result = subprocess.run([command, '--version'],
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    version = result.stdout.strip().split('\n')[0]
                    self.log(f"✓ {tool_name}: {version}")
                else:
                    missing_tools.append(tool_name)
            except (subprocess.TimeoutExpired, FileNotFoundError):
                missing_tools.append(tool_name)

        if missing_tools:
            self.log_error(f"Missing tools: {', '.join(missing_tools)}")
            self.log_info("Install with: pip install -r smartcontract/requirements-audit.txt")
            return False

        self.log_success("All prerequisites satisfied")
        return True

    def find_contract_files(self) -> List[Path]:
        """Find all Solidity contract files"""
        contract_files = []

        # Find .sol files in contracts directory
        for pattern in ['**/*.sol']:
            contract_files.extend(self.contracts_dir.glob(pattern))

        # Filter out node_modules and test files
        filtered_files = []
        for file_path in contract_files:
            if 'node_modules' not in str(file_path) and not file_path.name.startswith('Test'):
                filtered_files.append(file_path)

        return sorted(filtered_files)

    def run_slither_analysis(self, contract_path: Path = None) -> Dict[str, Any]:
        """Run Slither static analysis"""
        self.log("Running Slither analysis...")

        target = str(contract_path) if contract_path else str(self.contracts_dir)
        output_file = self.reports_dir / f"slither_report_{self.timestamp}.json"

        cmd = [
            'slither',
            target,
            '--json', str(output_file),
            '--filter-paths', 'node_modules/',
            '--exclude', 'naming-convention,external-function'
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            slither_results = {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'output_file': str(output_file) if output_file.exists() else None,
                'timestamp': self.timestamp
            }

            if result.returncode == 0:
                self.log_success(f"Slither analysis completed. Report saved to {output_file}")

                # Parse and summarize results
                if output_file.exists():
                    with open(output_file, 'r') as f:
                        data = json.load(f)

                    results = data.get('results', {}).get('detectors', [])
                    slither_results['findings'] = len(results)
                    slither_results['impacts'] = self._analyze_impacts(results)

                    self.log_info(f"Found {len(results)} potential issues")
                    for impact, count in slither_results['impacts'].items():
                        self.log(f"  {impact}: {count}")
            else:
                self.log_error("Slither analysis failed")
                self.log_error(result.stderr)

        except subprocess.TimeoutExpired:
            self.log_error("Slither analysis timed out")
            slither_results = {'success': False, 'error': 'timeout'}
        except Exception as e:
            self.log_error(f"Slither analysis error: {str(e)}")
            slither_results = {'success': False, 'error': str(e)}

        return slither_results

    def run_mythril_analysis(self, contract_path: Path) -> Dict[str, Any]:
        """Run Mythril symbolic analysis"""
        self.log(f"Running Mythril analysis on {contract_path.name}...")

        output_file = self.reports_dir / f"mythril_report_{contract_path.stem}_{self.timestamp}.json"

        cmd = [
            'myth',
            'analyze',
            str(contract_path),
            '--solv',
            '0.8.19',  # Solidity version
            '--execution-timeout',
            '120',
            '--json',
            str(output_file)
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            mythril_results = {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'output_file': str(output_file) if output_file.exists() else None,
                'timestamp': self.timestamp,
                'contract': contract_path.name
            }

            if result.returncode == 0:
                self.log_success(f"Mythril analysis completed for {contract_path.name}")

                if output_file.exists():
                    with open(output_file, 'r') as f:
                        data = json.load(f)

                    issues = data.get('issues', [])
                    mythril_results['findings'] = len(issues)
                    mythril_results['issues'] = issues

                    self.log_info(f"Found {len(issues)} potential security issues")
                    for issue in issues[:5]:  # Show first 5 issues
                        self.log(f"  - {issue.get('title', 'Unknown issue')}: {issue.get('description', '')[:100]}...")
            else:
                self.log_error(f"Mythril analysis failed for {contract_path.name}")
                self.log_error(result.stderr)

        except subprocess.TimeoutExpired:
            self.log_error(f"Mythril analysis timed out for {contract_path.name}")
            mythril_results = {'success': False, 'error': 'timeout', 'contract': contract_path.name}
        except Exception as e:
            self.log_error(f"Mythril analysis error for {contract_path.name}: {str(e)}")
            mythril_results = {'success': False, 'error': str(e), 'contract': contract_path.name}

        return mythril_results

    def _analyze_impacts(self, results: List[Dict]) -> Dict[str, int]:
        """Analyze impact levels from Slither results"""
        impacts = {'high': 0, 'medium': 0, 'low': 0, 'informational': 0}

        for result in results:
            impact = result.get('impact', '').lower()
            if 'high' in impact:
                impacts['high'] += 1
            elif 'medium' in impact:
                impacts['medium'] += 1
            elif 'low' in impact:
                impacts['low'] += 1
            else:
                impacts['informational'] += 1

        return impacts

    def run_gas_analysis(self, contract_path: Path) -> Dict[str, Any]:
        """Run gas consumption analysis"""
        self.log(f"Running gas analysis on {contract_path.name}...")

        output_file = self.reports_dir / f"gas_analysis_{contract_path.stem}_{self.timestamp}.txt"

        cmd = [
            'slither',
            str(contract_path),
            '--print', 'function-calls',
            '--print', 'variable-locations',
            '--print', 'data-dependencies'
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

            with open(output_file, 'w') as f:
                f.write(f"Gas Analysis Report for {contract_path.name}\n")
                f.write(f"Generated: {datetime.datetime.now()}\n")
                f.write("=" * 50 + "\n\n")
                f.write("STDOUT:\n")
                f.write(result.stdout)
                f.write("\nSTDERR:\n")
                f.write(result.stderr)

            gas_results = {
                'success': result.returncode == 0,
                'output_file': str(output_file),
                'contract': contract_path.name
            }

            if result.returncode == 0:
                self.log_success(f"Gas analysis completed for {contract_path.name}")
            else:
                self.log_warning(f"Gas analysis had issues for {contract_path.name}")

        except subprocess.TimeoutExpired:
            self.log_error(f"Gas analysis timed out for {contract_path.name}")
            gas_results = {'success': False, 'error': 'timeout', 'contract': contract_path.name}
        except Exception as e:
            self.log_error(f"Gas analysis error for {contract_path.name}: {str(e)}")
            gas_results = {'success': False, 'error': str(e), 'contract': contract_path.name}

        return gas_results

    def generate_comprehensive_report(self, slither_results: Dict,
                                    mythril_results: List[Dict],
                                    gas_results: List[Dict]) -> str:
        """Generate comprehensive audit report"""
        report_file = self.reports_dir / f"comprehensive_audit_report_{self.timestamp}.md"

        with open(report_file, 'w') as f:
            f.write("# Rabbit Launchpad Smart Contract Audit Report\n\n")
            f.write(f"**Generated:** {datetime.datetime.now()}\n")
            f.write(f"**Timestamp:** {self.timestamp}\n\n")

            # Executive Summary
            f.write("## Executive Summary\n\n")

            total_slither_findings = slither_results.get('findings', 0)
            total_mythril_findings = sum(r.get('findings', 0) for r in mythril_results)

            f.write(f"- **Total Slither Findings:** {total_slither_findings}\n")
            f.write(f"- **Total Mythril Findings:** {total_mythril_findings}\n")
            f.write(f"- **Contracts Analyzed:** {len(self.find_contract_files())}\n\n")

            if slither_results.get('impacts'):
                f.write("### Slither Impact Levels\n\n")
                for impact, count in slither_results['impacts'].items():
                    f.write(f"- **{impact.title()}:** {count}\n")
                f.write("\n")

            # Slither Results
            f.write("## Slither Static Analysis Results\n\n")
            if slither_results.get('success'):
                f.write(f"✅ Slither analysis completed successfully\n\n")

                if slither_results.get('output_file') and Path(slither_results['output_file']).exists():
                    with open(slither_results['output_file'], 'r') as slither_file:
                        slither_data = json.load(slither_file)

                    detectors = slither_data.get('results', {}).get('detectors', [])

                    if detectors:
                        f.write("### Detailed Findings\n\n")
                        for i, detector in enumerate(detectors[:10], 1):  # Top 10 findings
                            f.write(f"#### {i}. {detector.get('check', 'Unknown')}\n\n")
                            f.write(f"**Impact:** {detector.get('impact', 'Unknown')}\n")
                            f.write(f"**Confidence:** {detector.get('confidence', 'Unknown')}\n")
                            f.write(f"**Description:** {detector.get('description', 'No description')}\n\n")

                            if detector.get('elements'):
                                f.write("**Affected Files:**\n")
                                for element in detector['elements'][:3]:
                                    if element.get('source_mapping'):
                                        f.write(f"- `{element['source_mapping']['filename']}`\n")
                                f.write("\n")

                            if detector.get('id'):
                                f.write(f"**Detector ID:** `{detector['id']}`\n\n")
                    else:
                        f.write("No security issues found by Slither.\n\n")
            else:
                f.write("❌ Slither analysis failed\n\n")
                if slither_results.get('error'):
                    f.write(f"Error: {slither_results['error']}\n\n")

            # Mythril Results
            f.write("## Mythril Symbolic Analysis Results\n\n")

            if mythril_results:
                for result in mythril_results:
                    contract_name = result.get('contract', 'Unknown')
                    f.write(f"### {contract_name}\n\n")

                    if result.get('success'):
                        f.write("✅ Analysis completed successfully\n\n")

                        issues = result.get('issues', [])
                        if issues:
                            for i, issue in enumerate(issues[:5], 1):  # Top 5 issues
                                f.write(f"#### {i}. {issue.get('title', 'Unknown Issue')}\n\n")
                                f.write(f"**Severity:** {issue.get('severity', 'Unknown')}\n")
                                f.write(f"**Description:** {issue.get('description', 'No description')}\n\n")

                                if issue.get('locations'):
                                    f.write("**Locations:**\n")
                                    for loc in issue['locations']:
                                        f.write(f"- Line {loc.get('start_line', 'Unknown')} in {loc.get('source_map', 'Unknown')}\n")
                                    f.write("\n")
                        else:
                            f.write("No security issues found by Mythril.\n\n")
                    else:
                        f.write("❌ Analysis failed\n\n")
                        if result.get('error'):
                            f.write(f"Error: {result['error']}\n\n")

            # Gas Analysis
            f.write("## Gas Analysis Results\n\n")

            if gas_results:
                for result in gas_results:
                    contract_name = result.get('contract', 'Unknown')
                    f.write(f"### {contract_name}\n\n")

                    if result.get('success'):
                        f.write("✅ Gas analysis completed successfully\n\n")
                        if result.get('output_file'):
                            f.write(f"Detailed report: `{result['output_file']}`\n\n")
                    else:
                        f.write("❌ Gas analysis failed\n\n")

            # Recommendations
            f.write("## Security Recommendations\n\n")
            f.write("### High Priority\n\n")
            f.write("1. Review all high-impact findings from Slither\n")
            f.write("2. Address any critical security issues found by Mythril\n")
            f.write("3. Implement proper access controls if missing\n\n")

            f.write("### Medium Priority\n\n")
            f.write("1. Optimize gas usage for frequently called functions\n")
            f.write("2. Review and improve code documentation\n")
            f.write("3. Add more comprehensive test coverage\n\n")

            f.write("### Low Priority\n\n")
            f.write("1. Address code style and naming convention issues\n")
            f.write("2. Optimize for readability and maintainability\n\n")

            # Next Steps
            f.write("## Next Steps\n\n")
            f.write("1. Review all findings in detail\n")
            f.write("2. Implement fixes for identified issues\n")
            f.write("3. Re-run analysis after fixes\n")
            f.write("4. Consider third-party professional audit\n")
            f.write("5. Deploy to testnet for thorough testing\n\n")

            f.write("---\n")
            f.write("*This report was generated automatically using Slither and Mythril static analysis tools.*\n")

        self.log_success(f"Comprehensive report generated: {report_file}")
        return str(report_file)

    def audit_contracts(self, contract_path: Path = None,
                       run_mythril: bool = True,
                       run_gas: bool = True) -> Dict[str, Any]:
        """Run comprehensive audit of smart contracts"""
        print(f"{Colors.CYAN}")
        print("🔍 Rabbit Launchpad Smart Contract Audit")
        print("=" * 50)
        print(f"{Colors.NC}")

        # Check prerequisites
        if not self.check_prerequisites():
            return {'success': False, 'error': 'prerequisites_failed'}

        # Find contracts
        if contract_path:
            contract_files = [contract_path]
        else:
            contract_files = self.find_contract_files()

        if not contract_files:
            self.log_error("No contract files found")
            return {'success': False, 'error': 'no_contracts_found'}

        self.log(f"Found {len(contract_files)} contract(s) to analyze")
        for contract in contract_files:
            self.log(f"  - {contract.name}")

        audit_results = {
            'success': True,
            'timestamp': self.timestamp,
            'contracts_analyzed': len(contract_files),
            'slither_results': {},
            'mythril_results': [],
            'gas_results': []
        }

        # Run Slither analysis (on all contracts at once)
        self.log_info("Running Slither analysis on all contracts...")
        slither_results = self.run_slither_analysis(contract_path)
        audit_results['slither_results'] = slither_results

        # Run Mythril analysis (individual contracts)
        if run_mythril:
            for contract in contract_files:
                mythril_results = self.run_mythril_analysis(contract)
                audit_results['mythril_results'].append(mythril_results)

        # Run gas analysis
        if run_gas:
            for contract in contract_files:
                gas_results = self.run_gas_analysis(contract)
                audit_results['gas_results'].append(gas_results)

        # Generate comprehensive report
        report_file = self.generate_comprehensive_report(
            slither_results,
            audit_results['mythril_results'],
            audit_results['gas_results']
        )
        audit_results['report_file'] = report_file

        return audit_results

def main():
    parser = argparse.ArgumentParser(description='Rabbit Launchpad Smart Contract Auditor')
    parser.add_argument('--contracts-dir', default='smartcontract/contracts',
                       help='Directory containing smart contracts')
    parser.add_argument('--reports-dir', default='reports/audit',
                       help='Directory to save audit reports')
    parser.add_argument('--contract', type=str,
                       help='Specific contract file to audit')
    parser.add_argument('--no-mythril', action='store_true',
                       help='Skip Mythril analysis')
    parser.add_argument('--no-gas', action='store_true',
                       help='Skip gas analysis')
    parser.add_argument('--install-deps', action='store_true',
                       help='Install Python dependencies')

    args = parser.parse_args()

    # Install dependencies if requested
    if args.install_deps:
        print("Installing audit dependencies...")
        subprocess.run([
            sys.executable, '-m', 'pip', 'install',
            '-r', 'smartcontract/requirements-audit.txt'
        ])
        return

    # Initialize auditor
    auditor = SmartContractAuditor(
        contracts_dir=args.contracts_dir,
        reports_dir=args.reports_dir
    )

    # Determine contract path
    contract_path = None
    if args.contract:
        contract_path = Path(args.contract)
        if not contract_path.exists():
            print(f"Error: Contract file not found: {contract_path}")
            return 1

    # Run audit
    results = auditor.audit_contracts(
        contract_path=contract_path,
        run_mythril=not args.no_mythril,
        run_gas=not args.no_gas
    )

    # Print results summary
    print("\n" + "=" * 50)
    if results.get('success'):
        print(f"✅ Audit completed successfully!")
        print(f"📊 Contracts analyzed: {results['contracts_analyzed']}")
        print(f"📄 Report: {results['report_file']}")

        slither_findings = results['slither_results'].get('findings', 0)
        mythril_findings = sum(r.get('findings', 0) for r in results['mythril_results'])
        print(f"🔍 Total findings: {slither_findings + mythril_findings}")
    else:
        print(f"❌ Audit failed: {results.get('error', 'Unknown error')}")
        return 1

    return 0

if __name__ == '__main__':
    sys.exit(main())