const port = process.env.MCP_PORT;
if (!port) {
  throw new Error("MCP_PORT environment variable is required");
}

const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl) {
  throw new Error("API_BASE_URL environment variable is required");
}

const rustfsEndpoint = process.env.RUSTFS_ENDPOINT;
if (!rustfsEndpoint) {
  throw new Error("RUSTFS_ENDPOINT environment variable is required");
}

const rustfsAccessKey = process.env.RUSTFS_ACCESS_KEY;
if (!rustfsAccessKey) {
  throw new Error("RUSTFS_ACCESS_KEY environment variable is required");
}

const rustfsSecretKey = process.env.RUSTFS_SECRET_KEY;
if (!rustfsSecretKey) {
  throw new Error("RUSTFS_SECRET_KEY environment variable is required");
}

const rustfsBucket = process.env.RUSTFS_BUCKET;
if (!rustfsBucket) {
  throw new Error("RUSTFS_BUCKET environment variable is required");
}

const rustfsPublicUrl = process.env.RUSTFS_PUBLIC_URL;
if (!rustfsPublicUrl) {
  throw new Error("RUSTFS_PUBLIC_URL environment variable is required");
}

export const config = {
  port: parseInt(port, 10),
  apiBaseUrl,
  rustfs: {
    endpoint: rustfsEndpoint,
    accessKey: rustfsAccessKey,
    secretKey: rustfsSecretKey,
    bucket: rustfsBucket,
    publicUrl: rustfsPublicUrl,
  },
};
