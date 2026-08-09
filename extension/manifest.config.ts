import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,

  name: "HR ATS Candidate Finder",

  description:
    "Find and import job seeker posts from Facebook groups into HR ATS.",

  version: "1.0.0",

  permissions: ["storage", "activeTab", "tabs"],

  host_permissions: ["https://www.facebook.com/*", "http://localhost:8000/*", "https://talentbase-ats-production.up.railway.app/*"],

  action: {
    default_popup: "index.html",
    default_title: "HR ATS Candidate Finder",
  },

  background: {
    service_worker: "src/background/background.ts",
    type: "module",
  },

  content_scripts: [
    {
      matches: ["https://www.facebook.com/*"],

      js: ["src/content/facebook/facebook.content.ts"],

      run_at: "document_idle",
    },
  ],
});
