# Netlify Vite Environment

Experimental Vite Environment that allows any Vite-based framework to use Netlify Edge Functions (running in Deno) seamlessly.

It's built on the Environment API from [vite@6.0.0-alpha.11](https://www.npmjs.com/package/vite/v/6.0.0-alpha.11), and based on [Dario Piotrowicz's experimentations](https://github.com/dario-piotrowicz/vite-environment-6.0.0-alpha-experimentations).

It works by setting up a Deno environment with the Netlify runtime layer (the runner), and establishing a communication channel with the main environment in the Vite process (the host).

## Usage

1. Install dependencies

   ```sh
   pnpm install
   ```

2. Run example site

   ```sh
   cd examples/dummy-framework
   pnpm run dev
   ```

3. Navigate to the URL shown in the console
