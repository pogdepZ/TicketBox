const { execSync } = require('child_process');

const packages = [
  'expo-camera',
  'expo-sqlite',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-svg',
  'react-native-web'
];

packages.forEach(pkg => {
  try {
    const versionsRaw = execSync(`npm view ${pkg} versions --json`).toString();
    const versions = JSON.parse(versionsRaw);
    // get versions released around late 2024 / early 2025, or just find the one where peerDep is expo 54
    // Since this is slow, let's just grep the latest version that has expo 54
    for (let i = versions.length - 1; i >= 0; i--) {
      const v = versions[i];
      if (v.includes('-') || v.includes('alpha') || v.includes('beta')) continue;
      
      const peerDepsRaw = execSync(`npm view ${pkg}@${v} peerDependencies --json`).toString();
      if (!peerDepsRaw) continue;
      const peerDeps = JSON.parse(peerDepsRaw || "{}");
      if (peerDeps.expo && peerDeps.expo.includes('54')) {
        console.log(`${pkg}: ${v}`);
        break;
      }
    }
  } catch (e) {
    console.error(`Error for ${pkg}: ${e.message}`);
  }
});
