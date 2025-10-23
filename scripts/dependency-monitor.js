// scripts/dependency-monitor.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Dependency Monitoring Script
 * This script monitors dependencies for security vulnerabilities and updates
 */

console.log('🔍 Starting dependency monitoring...\n');

// Run npm audit
function runAudit() {
  console.log('📋 Running security audit...');
  try {
    const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
    const auditData = JSON.parse(auditOutput);
    
    console.log(`✅ Audit completed`);
    console.log(`   Vulnerabilities: ${auditData.metadata?.vulnerabilities?.total || 0}`);
    console.log(`   Low: ${auditData.metadata?.vulnerabilities?.low || 0}`);
    console.log(`   Moderate: ${auditData.metadata?.vulnerabilities?.moderate || 0}`);
    console.log(`   High: ${auditData.metadata?.vulnerabilities?.high || 0}`);
    console.log(`   Critical: ${auditData.metadata?.vulnerabilities?.critical || 0}\n`);
    
    return auditData;
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    return null;
  }
}

// Check for outdated packages
function checkOutdated() {
  console.log('📦 Checking for outdated packages...');
  try {
    const outdatedOutput = execSync('npm outdated --json', { encoding: 'utf8' });
    const outdatedData = JSON.parse(outdatedOutput);
    
    const packages = Object.keys(outdatedData);
    console.log(`✅ Found ${packages.length} outdated packages\n`);
    
    // Categorize updates
    const safeUpdates = [];
    const majorUpdates = [];
    
    packages.forEach(pkg => {
      const info = outdatedData[pkg];
      const current = info.current;
      const wanted = info.wanted;
      const latest = info.latest;
      
      // Check if it's a major version update
      const currentMajor = current.split('.')[0];
      const latestMajor = latest.split('.')[0];
      
      if (currentMajor !== latestMajor) {
        majorUpdates.push({ name: pkg, current, latest, type: 'major' });
      } else {
        safeUpdates.push({ name: pkg, current, wanted, latest, type: 'safe' });
      }
    });
    
    console.log(`📊 Update Summary:`);
    console.log(`   Safe updates: ${safeUpdates.length}`);
    console.log(`   Major updates: ${majorUpdates.length}\n`);
    
    return { safeUpdates, majorUpdates };
  } catch (error) {
    console.log('ℹ️  No outdated packages found\n');
    return { safeUpdates: [], majorUpdates: [] };
  }
}

// Generate update recommendations
function generateRecommendations(auditData, outdatedData) {
  console.log('💡 Generating update recommendations...\n');
  
  const recommendations = [];
  
  // Security-based recommendations
  if (auditData && auditData.metadata?.vulnerabilities?.total > 0) {
    recommendations.push({
      type: 'security',
      priority: 'high',
      message: 'Security vulnerabilities detected. Consider updating affected packages.',
      action: 'npm audit fix'
    });
  }
  
  // Safe update recommendations
  if (outdatedData.safeUpdates.length > 0) {
    const safePackages = outdatedData.safeUpdates.map(pkg => pkg.name).join(' ');
    recommendations.push({
      type: 'safe-update',
      priority: 'medium',
      message: `Safe updates available for ${outdatedData.safeUpdates.length} packages`,
      action: `npm update ${safePackages}`
    });
  }
  
  // Major update recommendations
  if (outdatedData.majorUpdates.length > 0) {
    recommendations.push({
      type: 'major-update',
      priority: 'low',
      message: `Major updates available for ${outdatedData.majorUpdates.length} packages. Test thoroughly.`,
      action: 'Review and update individually'
    });
  }
  
  // Display recommendations
  console.log('📋 Recommendations:');
  recommendations.forEach((rec, index) => {
    const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
    console.log(`   ${index + 1}. ${priority} ${rec.message}`);
    console.log(`      Action: ${rec.action}\n`);
  });
  
  return recommendations;
}

// Generate security report
function generateSecurityReport(auditData) {
  const reportPath = path.join(__dirname, '../docs/SECURITY_REPORT.md');
  
  const report = `# Security Report
Generated: ${new Date().toISOString()}

## Summary
- Total Vulnerabilities: ${auditData?.metadata?.vulnerabilities?.total || 0}
- Low: ${auditData?.metadata?.vulnerabilities?.low || 0}
- Moderate: ${auditData?.metadata?.vulnerabilities?.moderate || 0}
- High: ${auditData?.metadata?.vulnerabilities?.high || 0}
- Critical: ${auditData?.metadata?.vulnerabilities?.critical || 0}

## Vulnerabilities
${auditData?.vulnerabilities ? Object.keys(auditData.vulnerabilities).map(key => {
  const vuln = auditData.vulnerabilities[key];
  return `### ${key}
- Severity: ${vuln.severity}
- Description: ${vuln.description}
- Recommendation: ${vuln.recommendation || 'Update package'}`;
}).join('\n\n') : 'No vulnerabilities found'}

## Recommendations
1. Run \`npm audit fix\` to fix automatically resolvable vulnerabilities
2. Update packages with security vulnerabilities
3. Monitor for new vulnerabilities regularly
4. Use production builds for deployment

## Next Steps
- Review vulnerabilities above
- Update affected packages
- Test thoroughly after updates
- Monitor for new security advisories
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📄 Security report generated: ${reportPath}\n`);
}

// Main execution
async function main() {
  try {
    // Run security audit
    const auditData = runAudit();
    
    // Check for outdated packages
    const outdatedData = checkOutdated();
    
    // Generate recommendations
    const recommendations = generateRecommendations(auditData, outdatedData);
    
    // Generate security report
    if (auditData) {
      generateSecurityReport(auditData);
    }
    
    // Summary
    console.log('✅ Dependency monitoring completed');
    console.log(`📊 Found ${recommendations.length} recommendations`);
    console.log('📄 Check docs/SECURITY_REPORT.md for detailed information');
    
  } catch (error) {
    console.error('❌ Dependency monitoring failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runAudit, checkOutdated, generateRecommendations };
