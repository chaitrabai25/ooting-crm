const CLOUD_TIDB_URL = 'mysql://2AJqT6QgbdvDayf.root:7xCl3FL0jIFUVu5D@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/ooting_crm?sslaccept=strict';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = CLOUD_TIDB_URL;
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

import app from '../server/src/app.js';

export default function handler(req: any, res: any) {
  return app(req, res);
}
