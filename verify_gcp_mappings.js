
import { normalizeServiceName, getCloudIcon } from './src/utils/cloudIcons.js';
import { localIconMap } from './src/utils/localIconMap.js';

const gcpServices = [
    // 1. Compute & Containers
    "Compute Engine", "Virtual Machines", "VMs",
    "Google Kubernetes Engine", "GKE",
    "Cloud Run",
    "Cloud Functions",
    "App Engine",
    "Google Distributed Cloud", "GDC",
    "VMware Engine",
    "Batch",

    // 2. AI & Machine Learning
    "Vertex AI Platform", "Vertex AI",
    "Vertex AI Search & Conversation",
    "Vertex AI Agent Builder",
    "Gemini API",
    "Model Garden",
    "AutoML",
    "Document AI",
    "Speech-to-Text", "Text-to-Speech",
    "Cloud Translation API",
    "Video Intelligence API",

    // 3. Databases
    "AlloyDB for PostgreSQL", "AlloyDB",
    "Cloud SQL",
    "Cloud Spanner",
    "Cloud Bigtable",
    "Firestore",
    "Memorystore",
    "Database Migration Service", "DMS",

    // 4. Storage
    "Cloud Storage",
    "Persistent Disk",
    "Filestore",
    "Google Cloud NetApp Volumes",
    "Local SSD",
    "Backup and DR Service",

    // 5. Networking
    "VPC", "Virtual Private Cloud",
    "Cloud Load Balancing",
    "Cloud DNS",
    "Cloud CDN",
    "Cloud Interconnect",
    "Cloud VPN",
    "Cloud NAT",
    "Network Intelligence Center",
    "Service Directory",

    // 6. Data & Analytics
    "BigQuery",
    "Looker",
    "Dataflow",
    "Dataproc",
    "Cloud Composer",
    "Pub/Sub",
    "Dataplex",
    "Data Fusion",

    // 7. Security & Identity
    "IAM", "Identity and Access Management",
    "Identity-Aware Proxy", "IAP",
    "Cloud Security Command Center", "SCC",
    "Cloud Armor",
    "Secret Manager",
    "Cloud Key Management Service", "KMS",
    "BeyondCorp Enterprise",
    "Chronicle Security Operations",

    // 8. Management & Developer Tools
    "Cloud Build",
    "Artifact Registry",
    "Cloud Deploy",
    "Deployment Manager", "Infrastructure Manager",
    "Cloud Shell", "Cloud Workstations",
    "Operations Suite", "Stackdriver",
    "Apigee"
];

const categoryMap = {
    // 1. Compute
    "compute engine": "computeengine",
    "virtual machines": "computeengine",
    "vms": "computeengine",
    "google kubernetes engine": "gke",
    "gke": "gke",
    "cloud run": "cloudrun",
    "cloud functions": "serverlesscomputing", // or compute
    "app engine": "compute", // or serverlesscomputing
    "google distributed cloud": "distributedcloud",
    "gdc": "distributedcloud",
    "vmware engine": "compute",
    "batch": "compute",

    // 2. AI
    "vertex ai platform": "vertexai",
    "vertex ai": "vertexai",
    "vertex ai search & conversation": "vertexai",
    "vertex ai agent builder": "agents",
    "gemini api": "aimachinelearning",
    "model garden": "aimachinelearning",
    "automl": "aimachinelearning",
    "document ai": "aimachinelearning",
    "speech-to-text": "aimachinelearning",
    "text-to-speech": "aimachinelearning",
    "cloud translation api": "aimachinelearning",
    "video intelligence api": "aimachinelearning",

    // 3. Databases
    "alloydb for postgresql": "alloydb",
    "alloydb": "alloydb",
    "cloud sql": "cloudsql",
    "cloud spanner": "cloudspanner",
    "cloud bigtable": "databases",
    "firestore": "databases",
    "memorystore": "databases",
    "database migration service": "migration",
    "dms": "migration",

    // 4. Storage
    "cloud storage": "cloud_storage",
    "persistent disk": "storage",
    "filestore": "storage",
    "google cloud netapp volumes": "storage",
    "local ssd": "storage",
    "backup and dr service": "storage",

    // 5. Networking
    "vpc": "networking",
    "virtual private cloud": "networking",
    "cloud load balancing": "networking",
    "cloud dns": "networking",
    "cloud cdn": "networking",
    "cloud interconnect": "networking",
    "cloud vpn": "networking",
    "cloud nat": "networking",
    "network intelligence center": "networking",
    "service directory": "networking",

    // 6. Data & Analytics
    "bigquery": "bigquery",
    "looker": "looker",
    "dataflow": "dataanalytics",
    "dataproc": "dataanalytics",
    "cloud composer": "dataanalytics",
    "pub/sub": "dataanalytics",
    "dataplex": "dataanalytics",
    "data fusion": "dataanalytics",

    // 7. Security
    "iam": "securityidentity",
    "identity and access management": "securityidentity",
    "identity-aware proxy": "securityidentity",
    "iap": "securityidentity",
    "cloud security command center": "securitycommandcenter",
    "scc": "securitycommandcenter",
    "cloud armor": "securityidentity",
    "secret manager": "securityidentity",
    "cloud key management service": "securityidentity",
    "kms": "securityidentity",
    "beyondcorp enterprise": "securityidentity",
    "chronicle security operations": "secops",

    // 8. Management
    "cloud build": "devops",
    "artifact registry": "devops",
    "cloud deploy": "devops",
    "deployment manager": "managementtools",
    "infrastructure manager": "managementtools",
    "cloud shell": "developer_tools",
    "cloud workstations": "developer_tools",
    "operations suite": "operations",
    "stackdriver": "operations",
    "apigee": "apigee"
};

const checkGCPMappings = () => {
    console.log("Checking GCP Mappings...");
    const missing = [];
    const mappingCode = [];

    gcpServices.forEach(service => {
        const normalized = normalizeServiceName(service);
        // localIconMap['gcp'] keys are what we need to hit
        // getCloudIcon calls normalizeServiceName, then looks up in icon map

        // We simulate the lookup that getCloudIcon does
        // But since we want to generate aliases for cloudIcons.js,
        // we check if the normalized name ALREADY exists in localIconMap.gcp
        // If not, we propose an alias from our categoryMap.

        const localKey = normalized; // cloudIcons.js logic is complex, but assuming simple normalization for now

        // Actually, let's see if our proposed alias helps
        const targetKey = categoryMap[service.toLowerCase()];

        if (!targetKey) {
            console.warn(`No category mapping for: ${service}`);
            return;
        }

        // Check if the target key exists in localIconMap
        if (!localIconMap.gcp[targetKey]) {
            console.error(`Target key '${targetKey}' does not exist in localIconMap for ${service}`);
        } else {
            // We want to generate: 'normalized_service_name': 'target_key'
            // But verify if it's already working (i.e. if normalized name == target key)
            if (normalized !== targetKey) {
                mappingCode.push(`        '${normalized}': '${targetKey}',`);
            }
        }
    });

    console.log("        // GCP Aliases (Generated)");
    console.log(mappingCode.join('\n'));
};

checkGCPMappings();
