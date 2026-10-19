/**
 * Media storage providers (admin: Media → Media Settings). "local" is this project's uploads/
 * folder (the default); every other provider speaks the S3 API, so one client
 * (@aws-sdk/client-s3) serves them all and only the endpoint / public URL differ.
 *
 * fields: what the admin form asks for. secret: stored encrypted, never sent back in full.
 * endpoint(cfg): S3 API endpoint (undefined = AWS default). publicBase(cfg): default base URL of
 * public files when "Public URL" is empty. acl: the provider honours object ACLs (public-read).
 */

const FOLDER = { key: 'folder', label: 'Folder (key prefix)', placeholder: 'uploads', help: 'Files are stored under this path in the bucket.' };
const PUBLIC_URL = (help) => ({ key: 'publicUrl', label: 'Public URL (CDN / custom domain)', placeholder: 'https://cdn.example.com', help });
const KEYS = [
  { key: 'accessKeyId', label: 'Access key ID', required: true },
  { key: 'secretAccessKey', label: 'Secret access key', required: true, secret: true },
];

const PROVIDERS = {
  local: {
    label: 'Project folder (local)',
    description: "Files are saved in the backend's uploads/ folder and served by the API. Default when no cloud storage is set up.",
    icon: 'bi-hdd',
    fields: [],
  },
  s3: {
    label: 'Amazon S3',
    description: 'AWS S3 bucket. Optional CloudFront domain as the public URL.',
    icon: 'bi-amazon',
    acl: true,
    fields: [
      ...KEYS,
      { key: 'bucket', label: 'Bucket name', required: true, placeholder: 'my-company-media' },
      { key: 'region', label: 'Region', required: true, placeholder: 'ap-south-1' },
      PUBLIC_URL('Leave empty to use https://<bucket>.s3.<region>.amazonaws.com'),
      FOLDER,
    ],
    endpoint: () => undefined,
    publicBase: (c) => `https://${c.bucket}.s3.${c.region}.amazonaws.com`,
  },
  r2: {
    label: 'Cloudflare R2',
    description: 'R2 bucket. Enable public access (r2.dev) or connect a custom domain, then paste it as the public URL.',
    icon: 'bi-cloud',
    fields: [
      { key: 'accountId', label: 'Account ID', required: true, placeholder: '32-character account id' },
      ...KEYS,
      { key: 'bucket', label: 'Bucket name', required: true },
      PUBLIC_URL('Required: the bucket\'s r2.dev URL or custom domain, e.g. https://media.example.com'),
      FOLDER,
    ],
    requiredPublicUrl: true,
    region: () => 'auto',
    endpoint: (c) => `https://${c.accountId}.r2.cloudflarestorage.com`,
    publicBase: () => '',
  },
  spaces: {
    label: 'DigitalOcean Spaces',
    description: 'Spaces bucket (S3 compatible). The Spaces CDN URL can be used as the public URL.',
    icon: 'bi-water',
    acl: true,
    fields: [
      ...KEYS,
      { key: 'bucket', label: 'Space name', required: true },
      { key: 'region', label: 'Region', required: true, placeholder: 'blr1' },
      PUBLIC_URL('Leave empty to use https://<space>.<region>.digitaloceanspaces.com'),
      FOLDER,
    ],
    endpoint: (c) => `https://${c.region}.digitaloceanspaces.com`,
    publicBase: (c) => `https://${c.bucket}.${c.region}.digitaloceanspaces.com`,
  },
  wasabi: {
    label: 'Wasabi',
    description: 'Wasabi hot cloud storage bucket (S3 compatible).',
    icon: 'bi-box',
    acl: true,
    fields: [
      ...KEYS,
      { key: 'bucket', label: 'Bucket name', required: true },
      { key: 'region', label: 'Region', required: true, placeholder: 'ap-southeast-1' },
      PUBLIC_URL('Leave empty to use https://s3.<region>.wasabisys.com/<bucket>'),
      FOLDER,
    ],
    pathStyle: true,
    endpoint: (c) => `https://s3.${c.region}.wasabisys.com`,
    publicBase: (c) => `https://s3.${c.region}.wasabisys.com/${c.bucket}`,
  },
  b2: {
    label: 'Backblaze B2',
    description: 'B2 bucket through its S3-compatible API. The bucket must be public.',
    icon: 'bi-archive',
    fields: [
      { key: 'accessKeyId', label: 'Key ID', required: true },
      { key: 'secretAccessKey', label: 'Application key', required: true, secret: true },
      { key: 'bucket', label: 'Bucket name', required: true },
      { key: 'region', label: 'Region', required: true, placeholder: 'us-west-004' },
      PUBLIC_URL('Leave empty to use https://<bucket>.s3.<region>.backblazeb2.com'),
      FOLDER,
    ],
    endpoint: (c) => `https://s3.${c.region}.backblazeb2.com`,
    publicBase: (c) => `https://${c.bucket}.s3.${c.region}.backblazeb2.com`,
  },
  gcs: {
    label: 'Google Cloud Storage',
    description: 'GCS bucket via its S3 interoperability (Settings → Interoperability → HMAC keys). The bucket must allow public reads.',
    icon: 'bi-google',
    fields: [
      { key: 'accessKeyId', label: 'HMAC access key', required: true },
      { key: 'secretAccessKey', label: 'HMAC secret', required: true, secret: true },
      { key: 'bucket', label: 'Bucket name', required: true },
      PUBLIC_URL('Leave empty to use https://storage.googleapis.com/<bucket>'),
      FOLDER,
    ],
    pathStyle: true,
    region: () => 'auto',
    endpoint: () => 'https://storage.googleapis.com',
    publicBase: (c) => `https://storage.googleapis.com/${c.bucket}`,
  },
  custom: {
    label: 'Other S3-compatible',
    description: 'MinIO, Linode, Vultr, IDrive e2 or any other S3-compatible storage.',
    icon: 'bi-gear',
    fields: [
      { key: 'endpoint', label: 'Endpoint URL', required: true, placeholder: 'https://s3.example.com' },
      ...KEYS,
      { key: 'bucket', label: 'Bucket name', required: true },
      { key: 'region', label: 'Region', placeholder: 'us-east-1' },
      PUBLIC_URL('Required: base URL where the bucket\'s files are publicly readable.'),
      { key: 'pathStyle', label: 'Path-style URLs (MinIO)', type: 'switch' },
      { key: 'acl', label: 'Set files to public-read (ACL)', type: 'switch' },
      FOLDER,
    ],
    requiredPublicUrl: true,
    endpoint: (c) => c.endpoint,
    publicBase: () => '',
  },
};

/** Catalog for the admin form (no functions). */
const catalog = () => Object.entries(PROVIDERS).map(([key, p]) => ({
  key,
  label: p.label,
  description: p.description,
  icon: p.icon,
  fields: p.fields,
  requiredPublicUrl: Boolean(p.requiredPublicUrl),
}));

module.exports = { PROVIDERS, catalog };
