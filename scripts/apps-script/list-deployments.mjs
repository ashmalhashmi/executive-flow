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
  auth.setCredentials(token);
  const script = google.script({ version: 'v1', auth });

  const list = await script.projects.deployments.list({ scriptId: SCRIPT_ID });
  console.log(JSON.stringify(list.data, null, 2));
}

main().catch((err) => console.error(err.response?.data || err.message));
