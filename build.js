const fs = require('fs');
const archiver = require('archiver');
const path = require('path');


// Function to remove localhost paths
function removeLocalhostPaths(manifest) {
    // Remove localhost from content_scripts matches
    manifest.content_scripts.forEach(script => {
        script.matches = script.matches.filter(url => !url.includes('localhost'));
    });

    // Remove localhost from host_permissions
    manifest.host_permissions = manifest.host_permissions.filter(url => !url.includes('localhost'));

    return manifest;
}
const srcManifestPath = path.join(__dirname, 'src/manifest.json');
const distManifestPath = path.join(__dirname, 'dist/manifest.json'); // Modified manifest will be written here
const manifest = JSON.parse(fs.readFileSync(srcManifestPath, 'utf8'));
const updatedManifest = removeLocalhostPaths(manifest);

const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath);
}

fs.writeFileSync(distManifestPath, JSON.stringify(updatedManifest, null, 2));

const output = fs.createWriteStream(path.join(distPath, 'extension.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function () {
    console.log(`Extension is zipped: ${archive.pointer()} total bytes`);
});

archive.on('error', function (err) {
    throw err;
});

archive.pipe(output);
archive.glob('**/*', { cwd: 'src', ignore: ['manifest.json'] });
archive.append(fs.createReadStream(distManifestPath), { name: 'manifest.json' });
archive.finalize();