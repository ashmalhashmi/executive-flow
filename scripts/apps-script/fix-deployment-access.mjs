import fs from 'fs';
import os from 'os';
import path from 'path';
import { google } from 'googleapis';

const SCRIPT_ID = '1oBx93fHPb0BZHxeFCO5sqhIm0L5C_cAZXXzzT2BlP7zWv0HpVRYrXJFp';
const DEPLOYMENT_ID =
  'AKfycbwtyPY4_hzrSLayti5dt_DBNqTLcWT6zaJAwzwpkUYv6gwYw75T-FyWe0m9DMK4cmc';
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
    requestBody: { description: 'Executive Flow appendRow backup v7' },
  });

  const updated = await script.projects.deployments.update({
    scriptId: SCRIPT_ID,
    deploymentId: DEPLOYMENT_ID,
    requestBody: {
      deploymentConfig: {
        versionNumber: versionRes.data.versionNumber,
        description: 'Executive Flow appendRow backup',
        manifestFileName: 'appsscript',
      },
    },
  });

  const webApp = (updated.data.entryPoints || []).find((e) => e.entryPointType === 'WEB_APP');
  console.log(
    JSON.stringify(
      {
        deploymentId: updated.data.deploymentId,
        url: webApp?.webApp?.url || '',
        access: webApp?.webApp?.access,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(JSON.stringify(err.response?.data || err.message, null, 2));
  process.exit(1);
});
