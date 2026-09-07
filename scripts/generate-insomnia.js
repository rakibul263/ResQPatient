import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const postmanPath = path.resolve("ResQPatient.postman_collection.json");
if (!fs.existsSync(postmanPath)) {
  console.error("Postman collection not found at:", postmanPath);
  process.exit(1);
}

const postman = JSON.parse(fs.readFileSync(postmanPath, "utf8"));

const WORKSPACE_ID = "wrk_resqpatient_backend";
const BASE_ENV_ID = "env_base_resqpatient";
const PROD_ENV_ID = "env_prod_resqpatient";
const LOCAL_ENV_ID = "env_local_resqpatient";
const NOW = Date.now();

const resources = [];

// 1. Workspace
const workspace = {
  _id: WORKSPACE_ID,
  parentId: null,
  modified: NOW,
  created: NOW,
  name: "ResQPatient API",
  description: "Comprehensive Emergency Ambulance Dispatch & Response Platform API Collection",
  scope: "collection",
  _type: "workspace",
  type: "Workspace",
};
resources.push(workspace);

// Extract environment variables from Postman
const envData = {};
const envOrder = [];
if (Array.isArray(postman.variable)) {
  for (const v of postman.variable) {
    envData[v.key] = v.value || "";
    envOrder.push(v.key);
  }
}

// 2. Base Environment
const baseEnv = {
  _id: BASE_ENV_ID,
  parentId: WORKSPACE_ID,
  modified: NOW,
  created: NOW,
  name: "Base Environment",
  data: envData,
  dataPropertyOrder: {
    "&": envOrder,
  },
  color: null,
  isPrivate: false,
  metaSortKey: NOW,
  _type: "environment",
  type: "Environment",
};
resources.push(baseEnv);

// 3. Production Environment (Render)
const prodEnv = {
  _id: PROD_ENV_ID,
  parentId: BASE_ENV_ID,
  modified: NOW,
  created: NOW,
  name: "Production (Render)",
  data: {
    baseUrl: "https://resqpatient.onrender.com",
  },
  dataPropertyOrder: {
    "&": ["baseUrl"],
  },
  color: "#7d69cb",
  isPrivate: false,
  metaSortKey: NOW + 1,
  _type: "environment",
  type: "Environment",
};
resources.push(prodEnv);

// 4. Local Development Environment
const localEnv = {
  _id: LOCAL_ENV_ID,
  parentId: BASE_ENV_ID,
  modified: NOW,
  created: NOW,
  name: "Local Development",
  data: {
    baseUrl: "http://localhost:3000",
  },
  dataPropertyOrder: {
    "&": ["baseUrl"],
  },
  color: "#44bb66",
  isPrivate: false,
  metaSortKey: NOW + 2,
  _type: "environment",
  type: "Environment",
};
resources.push(localEnv);

let folderCounter = 0;
let requestCounter = 0;

function parseItems(items, parentId) {
  for (const item of items) {
    if (item.item && Array.isArray(item.item)) {
      // It's a folder (RequestGroup)
      folderCounter++;
      const folderId = `fld_${String(folderCounter).padStart(3, "0")}_${item.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
      const folder = {
        _id: folderId,
        parentId: parentId,
        modified: NOW,
        created: NOW,
        name: item.name,
        description: item.description || "",
        environment: {},
        environmentPropertyOrder: null,
        metaSortKey: -NOW + folderCounter * 100,
        _type: "request_group",
        type: "RequestGroup",
      };
      resources.push(folder);
      parseItems(item.item, folderId);
    } else if (item.request) {
      // It's a Request
      requestCounter++;
      const reqId = `req_${String(requestCounter).padStart(3, "0")}_${item.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
      const reqData = item.request;

      // Format URL: convert {{baseUrl}} to {{ _.baseUrl }} or keep {{baseUrl}} (Insomnia supports both)
      let url = "";
      if (typeof reqData.url === "string") {
        url = reqData.url;
      } else if (reqData.url && reqData.url.raw) {
        url = reqData.url.raw;
      }

      // Headers
      const headers = [];
      if (Array.isArray(reqData.header)) {
        for (const h of reqData.header) {
          headers.push({
            name: h.key,
            value: h.value,
            disabled: h.disabled || false,
          });
        }
      }

      // Body
      let body = {};
      if (reqData.body && reqData.body.mode === "raw" && reqData.body.raw) {
        body = {
          mimeType: "application/json",
          text: reqData.body.raw,
        };
      }

      // Authentication
      let authentication = {};
      if (reqData.auth && reqData.auth.type === "bearer") {
        const tokenObj = reqData.auth.bearer?.find((b) => b.key === "token");
        authentication = {
          type: "bearer",
          token: tokenObj?.value || "",
          disabled: false,
        };
      } else {
        // Check for headers like Authorization
        const authHeader = headers.find((h) => h.name.toLowerCase() === "authorization");
        if (authHeader) {
          const match = authHeader.value.match(/Bearer\s+(.*)/i);
          if (match) {
            authentication = {
              type: "bearer",
              token: match[1],
              disabled: false,
            };
          }
        }
      }

      const requestResource = {
        _id: reqId,
        parentId: parentId,
        modified: NOW,
        created: NOW,
        url: url,
        name: item.name,
        description: reqData.description || "",
        method: reqData.method || "GET",
        body: body,
        parameters: [],
        headers: headers,
        authentication: authentication,
        metaSortKey: -NOW + requestCounter * 10,
        isPrivate: false,
        settingStoreCookies: true,
        settingSendCookies: true,
        settingDisableRenderRequestBody: false,
        settingEncodeUrl: true,
        settingRebuildPath: true,
        settingFollowRedirects: "global",
        _type: "request",
        type: "Request",
      };
      resources.push(requestResource);
    }
  }
}

parseItems(postman.item, WORKSPACE_ID);

// Write standalone insomnia.json (v4 export format)
const exportPayload = {
  _type: "export",
  __export_format: 4,
  __export_date: new Date().toISOString(),
  __export_source: "insomnia.desktop.app:v10.0.0",
  resources: resources.map((r) => {
    // Standard Insomnia export JSON uses _type and strips `type`
    const copy = { ...r };
    delete copy.type;
    return copy;
  }),
};

fs.writeFileSync("insomnia.json", JSON.stringify(exportPayload, null, 2), "utf8");
fs.writeFileSync("Insomnia_ResQPatient.json", JSON.stringify(exportPayload, null, 2), "utf8");
console.log(`✅ Successfully generated insomnia.json and Insomnia_ResQPatient.json with ${resources.length} resources!`);

// Write .insomnia Git Sync structure
const baseInsomniaDir = path.resolve(".insomnia");
if (fs.existsSync(baseInsomniaDir)) {
  fs.rmSync(baseInsomniaDir, { recursive: true, force: true });
}

for (const res of resources) {
  const typeDirName = res.type; // Workspace, Environment, RequestGroup, Request
  const targetDir = path.join(baseInsomniaDir, typeDirName);
  fs.mkdirSync(targetDir, { recursive: true });

  const filePath = path.join(targetDir, `${res._id}.yml`);
  // In Git Sync YAML, Insomnia models omit `_type` and use `type`
  const yamlObj = { ...res };
  delete yamlObj._type;

  const yamlContent = yaml.dump(yamlObj, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  fs.writeFileSync(filePath, yamlContent, "utf8");
}

console.log(`✅ Successfully populated .insomnia/ Git Sync directory with all models!`);
