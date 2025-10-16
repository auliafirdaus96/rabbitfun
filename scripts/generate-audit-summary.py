#!/usr/bin/env python3
"""
Generate audit summary from audit reports
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime

def generate_summary(reports_dir: str) -> str:
    """Generate audit summary from reports directory"""
    reports_path = Path(reports_dir)

    summary = []
    summary.append("### 📊 Audit Summary")
    summary.append("")

    # Find Slither report
    slither_reports = list(reports_path.glob("slither_report_*.json"))
    if slither_reports:
        latest_slither = max(slither_reports, key=os.path.getmtime)
        try:
            with open(latest_slither, 'r') as f:
                slither_data = json.load(f)

            detectors = slither_data.get('results', {}).get('detectors', [])

            # Categorize findings
            high_impact = [d for d in detectors if 'high' in d.get('impact', '').lower()]
            medium_impact = [d for d in detectors if 'medium' in d.get('impact', '').lower()]
            low_impact = [d for d in detectors if 'low' in d.get('impact', '').lower()]
            informational = [d for d in detectors if d not in high_impact and d not in medium_impact and d not in low_impact]

            summary.append("#### 🔍 Slither Analysis")
            summary.append(f"- **High Impact:** {len(high_impact)}")
            summary.append(f"- **Medium Impact:** {len(medium_impact)}")
            summary.append(f"- **Low Impact:** {len(low_impact)}")
            summary.append(f"- **Informational:** {len(informational)}")

            if high_impact:
                summary.append("")
                summary.append("**🚨 High Priority Issues:**")
                for i, finding in enumerate(high_impact[:3], 1):
                    summary.append(f"{i}. **{finding.get('check', 'Unknown')}**")
                    summary.append(f"   - *{finding.get('description', '')[:100]}...*")
                if len(high_impact) > 3:
                    summary.append(f"   - *and {len(high_impact) - 3} more...*")

            summary.append("")
        except Exception as e:
            summary.append(f"❌ Error processing Slither report: {e}")

    # Find Mythril reports
    mythril_reports = list(reports_path.glob("mythril_report_*.json"))
    total_mythril_findings = 0

    if mythril_reports:
        for report_file in mythril_reports:
            try:
                with open(report_file, 'r') as f:
                    mythril_data = json.load(f)
                issues = mythril_data.get('issues', [])
                total_mythril_findings += len(issues)
            except:
                pass

        summary.append("#### 🔮 Mythril Symbolic Analysis")
        summary.append(f"- **Security Issues:** {total_mythril_findings}")
        summary.append("")

    # Overall assessment
    summary.append("#### 📋 Overall Assessment")

    high_count = len(high_impact) if 'high_impact' in locals() else 0
    mythril_count = total_mythril_findings

    if high_count == 0 and mythril_count == 0:
        summary.append("✅ **No critical security issues detected**")
    elif high_count > 0:
        summary.append(f"🚨 **{high_count} critical issues require immediate attention**")
    elif mythril_count > 0:
        summary.append(f"⚠️ **{mythril_count} potential security issues found**")

    summary.append("")
    summary.append("### 📝 Recommendations")

    if high_count > 0:
        summary.append("1. **IMMEDIATE:** Address all high-impact findings")
        summary.append("2. Review and fix security vulnerabilities")
    elif mythril_count > 0:
        summary.append("1. Review Mythril findings for potential risks")
        summary.append("2. Consider manual code review for complex logic")
    else:
        summary.append("1. Continue following security best practices")
        summary.append("2. Maintain comprehensive test coverage")

    summary.append("3. Run audits regularly, especially before deployments")
    summary.append("")

    # Add timestamp
    summary.append(f"*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC*")

    return "\n".join(summary)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python generate-audit-summary.py <reports_dir>")
        sys.exit(1)

    reports_dir = sys.argv[1]
    print(generate_summary(reports_dir))