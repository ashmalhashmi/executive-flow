import fs from 'fs';
import os from 'os';
import path from 'path';
import { google } from 'googleapis';

const SCRIPT_ID = '1oBx93fHPb0BZHxeFCO5sqhIm0L5C_cAZXXzzT2BlP7zWv0HpVRYrXJFp';
const CLASP_RC = path.join(os.homedir(), '.clasprc.json');

async function main() {
  const clasp = JSON.parse(fs.readFileSync(CLASP_RC, 'utf8'));
  const token = clasp.tokens.default;

  const auth = new google.auth.OAuth2(token.client_id, token.client_secret);
  auth.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry_date,
  });

  const script = google.script({ version: 'v1', auth });

  const versionRes = await script.projects.versions.create({
    scriptId: SCRIPT_ID,
    requestBody: { description: 'Executive Flow backup v2' },
  });
  const versionNumber = versionRes.data.versionNumber;

  const deployRes = await script.projects.deployments.create({
    scriptId: SCRIPT_ID,
    requestBody: {
      versionNumber,
      description: 'Executive Flow backup webhook public',
      manifestFileName: 'appsscript',
    },
  });

  const deploymentId = deployRes.data.deploymentId;
  const entryPoints = deployRes.data.entryPoints || [];
  const webApp = entryPoints.find((e) => e.entryPointType === 'WEB_APP');
  const url = webApp?.webApp?.url || '';

  console.log(JSON.stringify({ deploymentId, url, versionNumber }, null, 2));
}

main().catch((err) => {
  console.error(err.response?.data || err.message);
  process.exit(1);
});
