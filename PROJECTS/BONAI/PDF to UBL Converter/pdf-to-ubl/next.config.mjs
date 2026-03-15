/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push('@google-cloud/documentai');
        }
        return config;
    },
};

export default nextConfig;
