/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // self-contained build for systemd deployment
};
module.exports = nextConfig;
