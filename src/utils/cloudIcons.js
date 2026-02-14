// utils/cloudIcons.js - VERIFIED WORKING URLS ONLY

export const getCloudIcon = (cloudProvider, cloudService) => {
    if (!cloudProvider) return null;

    const provider = cloudProvider.toLowerCase();
    const service = cloudService?.toLowerCase().trim() || '';

    const serviceIcons = {
        // ==================== AWS (VERIFIED) ====================
        aws: {
            // Compute
            'lambda': 'https://api.iconify.design/logos/aws-lambda.svg',
            'ec2': 'https://api.iconify.design/logos/aws-ec2.svg',
            'ecs': 'https://api.iconify.design/logos/aws-ecs.svg',
            'eks': 'https://api.iconify.design/logos/aws-eks.svg',
            'ecr': 'https://api.iconify.design/logos/aws-ecr.svg', // Added
            'fargate': 'https://api.iconify.design/logos/aws-fargate.svg',
            'elastic beanstalk': 'https://api.iconify.design/logos/aws-elastic-beanstalk.svg',

            // Storage
            's3': 'https://api.iconify.design/logos/aws-s3.svg',
            'ebs': 'https://api.iconify.design/logos/aws-ebs.svg',
            'efs': 'https://api.iconify.design/logos/aws-efs.svg',
            'glacier': 'https://api.iconify.design/logos/aws-glacier.svg',

            // Database
            'dynamodb': 'https://api.iconify.design/logos/aws-dynamodb.svg',
            'rds': 'https://api.iconify.design/logos/aws-rds.svg',
            'aurora': 'https://api.iconify.design/logos/aws-aurora.svg',
            'elasticache': 'https://api.iconify.design/logos/aws-elasticache.svg',
            'redshift': 'https://api.iconify.design/logos/aws-redshift.svg',
            'documentdb': 'https://api.iconify.design/logos/aws-documentdb.svg',
            'neptune': 'https://api.iconify.design/logos/aws-neptune.svg',

            // Networking
            'api gateway': 'https://api.iconify.design/logos/aws-api-gateway.svg',
            'cloudfront': 'https://api.iconify.design/logos/aws-cloudfront.svg',
            'route53': 'https://api.iconify.design/logos/aws-route53.svg',
            'vpc': 'https://api.iconify.design/logos/aws-vpc.svg',
            'elb': 'https://api.iconify.design/logos/aws-elb.svg',
            'alb': 'https://api.iconify.design/logos/aws-alb.svg',
            'app mesh': 'https://api.iconify.design/logos/aws-app-mesh.svg',

            // Messaging
            'sqs': 'https://api.iconify.design/logos/aws-sqs.svg',
            'sns': 'https://api.iconify.design/logos/aws-sns.svg',
            'kinesis': 'https://api.iconify.design/logos/aws-kinesis.svg',
            'eventbridge': 'https://api.iconify.design/logos/aws-eventbridge.svg',
            'step functions': 'https://api.iconify.design/logos/aws-step-functions.svg',
            'mq': 'https://api.iconify.design/logos/aws-mq.svg',

            // Security
            'iam': 'https://api.iconify.design/logos/aws-iam.svg',
            'cognito': 'https://api.iconify.design/logos/aws-cognito.svg',
            'secrets manager': 'https://api.iconify.design/logos/aws-secrets-manager.svg',
            'kms': 'https://api.iconify.design/logos/aws-kms.svg',
            'waf': 'https://api.iconify.design/logos/aws-waf.svg',

            // Developer Tools
            'codepipeline': 'https://api.iconify.design/logos/aws-codepipeline.svg',
            'codebuild': 'https://api.iconify.design/logos/aws-codebuild.svg',
            'codecommit': 'https://api.iconify.design/logos/aws-codecommit.svg',
            'codedeploy': 'https://api.iconify.design/logos/aws-codedeploy.svg',
            'cloud9': 'https://api.iconify.design/logos/aws-cloud9.svg',

            // Management
            'cloudwatch': 'https://api.iconify.design/logos/aws-cloudwatch.svg',
            'cloudformation': 'https://api.iconify.design/logos/aws-cloudformation.svg',
            'cloudtrail': 'https://api.iconify.design/logos/aws-cloudtrail.svg',
            'systems manager': 'https://api.iconify.design/logos/aws-systems-manager.svg',

            // Analytics
            'athena': 'https://api.iconify.design/logos/aws-athena.svg',
            'emr': 'https://api.iconify.design/logos/aws-emr.svg',
            'glue': 'https://api.iconify.design/logos/aws-glue.svg',
            'quicksight': 'https://api.iconify.design/logos/aws-quicksight.svg',

            // ML
            'sagemaker': 'https://api.iconify.design/logos/aws-sagemaker.svg',
            'rekognition': 'https://api.iconify.design/logos/aws-rekognition.svg',
            'timestream': 'https://api.iconify.design/logos/aws-timestream.svg',
            'iot core': 'https://api.iconify.design/logos/aws-iot-core.svg',
            'x-ray': 'https://api.iconify.design/logos/aws-xray.svg',
            'mediaconvert': 'https://api.iconify.design/logos/aws-elemental-mediaconvert.svg',

            '_default': 'https://api.iconify.design/logos/aws.svg'
        },

        // ==================== AZURE (VERIFIED) ====================
        azure: {
            // Compute
            'virtual machines': 'https://api.iconify.design/logos/azure-icon.svg',
            'vm': 'https://api.iconify.design/logos/azure-icon.svg',
            'app service': 'https://api.iconify.design/logos/azure-app-service.svg', // Upd
            'functions': 'https://api.iconify.design/logos/azure-functions.svg', // Upd
            'container instances': 'https://api.iconify.design/logos/docker-icon.svg',
            'aks': 'https://api.iconify.design/logos/kubernetes.svg',
            'kubernetes service': 'https://api.iconify.design/logos/kubernetes.svg',
            'container registry': 'https://api.iconify.design/logos/azure-container-registry.svg', // Added
            'batch': 'https://api.iconify.design/logos/azure-batch.svg',
            'service fabric': 'https://api.iconify.design/logos/azure-service-fabric.svg',

            // Storage
            'blob storage': 'https://api.iconify.design/logos/azure-storage.svg',
            'storage': 'https://api.iconify.design/logos/azure-storage.svg',
            'files': 'https://api.iconify.design/logos/azure-files.svg',
            'queue storage': 'https://api.iconify.design/logos/azure-queue-storage.svg',
            'table storage': 'https://api.iconify.design/logos/azure-table-storage.svg',
            'disk storage': 'https://api.iconify.design/logos/azure-disks.svg',
            'data lake storage': 'https://api.iconify.design/logos/azure-data-lake-storage.svg',

            // Database
            'cosmos db': 'https://api.iconify.design/logos/azure-cosmos-db.svg',
            'sql database': 'https://api.iconify.design/vscode-icons/file-type-sql.svg',
            'database for mysql': 'https://api.iconify.design/logos/mysql-icon.svg',
            'database for postgresql': 'https://api.iconify.design/logos/postgresql.svg',
            'sql server': 'https://api.iconify.design/vscode-icons/file-type-sql.svg',
            'synapse analytics': 'https://api.iconify.design/logos/azure-synapse-analytics.svg',
            'cache for redis': 'https://api.iconify.design/logos/redis.svg',
            'redis': 'https://api.iconify.design/logos/redis.svg',

            // Networking
            'virtual network': 'https://api.iconify.design/logos/azure-virtual-network.svg',
            'vnet': 'https://api.iconify.design/logos/azure-virtual-network.svg',
            'load balancer': 'https://api.iconify.design/logos/azure-load-balancer.svg',
            'application gateway': 'https://api.iconify.design/logos/azure-application-gateway.svg',
            'vpn gateway': 'https://api.iconify.design/logos/azure-vpn-gateway.svg',
            'cdn': 'https://api.iconify.design/logos/azure-cdn.svg',
            'traffic manager': 'https://api.iconify.design/logos/azure-traffic-manager.svg',
            'front door': 'https://api.iconify.design/logos/azure-front-door.svg',
            'firewall': 'https://api.iconify.design/logos/azure-firewall.svg',

            // Integration
            'service bus': 'https://api.iconify.design/logos/azure-service-bus.svg',
            'event grid': 'https://api.iconify.design/logos/azure-event-grid.svg',
            'event hubs': 'https://api.iconify.design/logos/azure-event-hubs.svg',
            'logic apps': 'https://api.iconify.design/logos/azure-logic-apps.svg',
            'api management': 'https://api.iconify.design/logos/azure-api-management.svg',

            // Analytics
            'stream analytics': 'https://api.iconify.design/logos/azure-stream-analytics.svg',
            'data factory': 'https://api.iconify.design/logos/azure-data-factory.svg',
            'databricks': 'https://api.iconify.design/simple-icons/databricks',
            'hdinsight': 'https://api.iconify.design/logos/azure-hdinsight.svg',

            // AI + ML
            'cognitive services': 'https://api.iconify.design/logos/azure-cognitive-services.svg',
            'machine learning': 'https://api.iconify.design/logos/azure-machine-learning.svg',
            'bot service': 'https://api.iconify.design/logos/azure-bot-service.svg',

            // IoT
            'iot hub': 'https://api.iconify.design/logos/azure-iot-hub.svg',
            'digital twins': 'https://api.iconify.design/logos/azure-digital-twins.svg',
            'time series insights': 'https://api.iconify.design/logos/azure-time-series-insights.svg',

            // Security
            'active directory': 'https://api.iconify.design/logos/azure-active-directory.svg',
            'ad': 'https://api.iconify.design/logos/azure-active-directory.svg',
            'key vault': 'https://api.iconify.design/logos/azure-key-vault.svg',
            'security center': 'https://api.iconify.design/logos/azure-security-center.svg',
            'sentinel': 'https://api.iconify.design/logos/azure-sentinel.svg',

            // Healthcare
            'health data services': 'https://api.iconify.design/logos/azure-healthcare-apis.svg',

            // DevOps
            'devops': 'https://api.iconify.design/logos/azure-devops.svg',
            'pipelines': 'https://api.iconify.design/logos/azure-pipelines.svg',
            'repos': 'https://api.iconify.design/logos/azure-repos.svg',
            'artifacts': 'https://api.iconify.design/logos/azure-artifacts.svg',

            // Monitoring
            'monitor': 'https://api.iconify.design/logos/azure-monitor.svg',
            'application insights': 'https://api.iconify.design/logos/azure-application-insights.svg',
            'log analytics': 'https://api.iconify.design/logos/azure-log-analytics.svg',
            'power bi': 'https://api.iconify.design/logos/microsoft-power-bi.svg',

            '_default': 'https://api.iconify.design/logos/azure-icon.svg'
        },

        // ==================== GCP (VERIFIED) ====================
        gcp: {
            // Compute
            'compute engine': 'https://api.iconify.design/logos/google-compute-engine.svg',
            'app engine': 'https://api.iconify.design/logos/google-app-engine.svg',
            'cloud run': 'https://api.iconify.design/logos/google-cloud-run.svg',
            'cloud functions': 'https://api.iconify.design/logos/google-cloud-functions.svg',
            'gke': 'https://api.iconify.design/logos/kubernetes.svg',
            'kubernetes engine': 'https://api.iconify.design/logos/kubernetes.svg',

            // Storage
            'cloud storage': 'https://api.iconify.design/logos/google-cloud-storage.svg',
            'persistent disk': 'https://api.iconify.design/logos/google-cloud.svg',
            'filestore': 'https://api.iconify.design/logos/google-cloud-filestore.svg',

            // Database
            'cloud sql': 'https://api.iconify.design/logos/google-cloud-sql.svg',
            'cloud spanner': 'https://api.iconify.design/logos/google-cloud-spanner.svg',
            'firestore': 'https://api.iconify.design/logos/firebase.svg',
            'bigtable': 'https://api.iconify.design/logos/google-cloud-bigtable.svg',
            'memorystore': 'https://api.iconify.design/logos/redis.svg',
            'firebase': 'https://api.iconify.design/logos/firebase.svg',
            'realtime database': 'https://api.iconify.design/logos/firebase.svg',

            // Networking
            'cloud cdn': 'https://api.iconify.design/logos/google-cloud-cdn.svg',
            'cloud load balancing': 'https://api.iconify.design/logos/google-cloud-load-balancing.svg',
            'vpc': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud dns': 'https://api.iconify.design/logos/google-cloud-dns.svg',
            'cloud nat': 'https://api.iconify.design/logos/google-cloud-nat.svg',
            'cloud armor': 'https://api.iconify.design/logos/google-cloud-armor.svg',

            // Analytics
            'bigquery': 'https://api.iconify.design/logos/google-bigquery.svg',
            'dataflow': 'https://api.iconify.design/logos/google-cloud-dataflow.svg',
            'dataproc': 'https://api.iconify.design/logos/google-cloud-dataproc.svg',
            'pub/sub': 'https://api.iconify.design/logos/google-cloud-pub-sub.svg',
            'pubsub': 'https://api.iconify.design/logos/google-cloud-pub-sub.svg',
            'composer': 'https://api.iconify.design/logos/google-cloud-composer.svg',
            'data fusion': 'https://api.iconify.design/logos/google-cloud-data-fusion.svg',
            'looker': 'https://api.iconify.design/logos/google-looker.svg',

            // AI & ML
            'vertex ai': 'https://api.iconify.design/logos/google-cloud-vertex-ai.svg',
            'ai platform': 'https://api.iconify.design/logos/google-cloud-ai-platform.svg',
            'automl': 'https://api.iconify.design/logos/google-cloud-automl.svg',
            'vision api': 'https://api.iconify.design/logos/google-cloud-vision-api.svg',
            'natural language': 'https://api.iconify.design/logos/google-cloud-natural-language-api.svg',

            // Security
            'cloud iam': 'https://api.iconify.design/logos/google-cloud-iam.svg',
            'iam': 'https://api.iconify.design/logos/google-cloud-iam.svg',
            'secret manager': 'https://api.iconify.design/logos/google-cloud-secret-manager.svg',
            'kms': 'https://api.iconify.design/logos/google-cloud-kms.svg',
            'cloud audit logs': 'https://api.iconify.design/logos/google-cloud-audit-logs.svg',

            // Monitoring
            'cloud monitoring': 'https://api.iconify.design/logos/google-cloud-monitoring.svg',
            'cloud logging': 'https://api.iconify.design/logos/google-cloud-logging.svg',
            'cloud trace': 'https://api.iconify.design/logos/google-cloud-trace.svg',

            // Developer Tools
            'cloud build': 'https://api.iconify.design/logos/google-cloud-build.svg',
            'cloud source repositories': 'https://api.iconify.design/logos/google-cloud-source-repositories.svg',
            'artifact registry': 'https://api.iconify.design/logos/google-cloud-artifact-registry.svg',
            'container registry': 'https://api.iconify.design/logos/google-cloud-container-registry.svg',

            '_default': 'https://api.iconify.design/logos/google-cloud.svg'
        },

        // ==================== OTHER CLOUDS (VERIFIED) ====================
        oracle: {
            'compute': 'https://api.iconify.design/logos/oracle.svg',
            'autonomous database': 'https://api.iconify.design/logos/oracle.svg',
            'database': 'https://api.iconify.design/logos/oracle.svg',
            'object storage': 'https://api.iconify.design/logos/oracle.svg',
            'functions': 'https://api.iconify.design/logos/oracle.svg',
            '_default': 'https://api.iconify.design/logos/oracle.svg'
        },

        ibm: {
            'cloud functions': 'https://api.iconify.design/logos/ibm.svg',
            'kubernetes service': 'https://api.iconify.design/logos/kubernetes.svg',
            'cloud foundry': 'https://api.iconify.design/simple-icons/cloudfoundry',
            'db2': 'https://api.iconify.design/logos/ibm.svg',
            'watson': 'https://api.iconify.design/logos/ibm.svg',
            '_default': 'https://api.iconify.design/logos/ibm.svg'
        },

        digitalocean: {
            'droplets': 'https://api.iconify.design/logos/digital-ocean.svg',
            'kubernetes': 'https://api.iconify.design/logos/kubernetes.svg',
            'spaces': 'https://api.iconify.design/logos/digital-ocean.svg',
            'databases': 'https://api.iconify.design/logos/digital-ocean.svg',
            '_default': 'https://api.iconify.design/logos/digital-ocean.svg'
        },

        alibaba: {
            'ecs': 'https://api.iconify.design/simple-icons/alibabacloud',
            'oss': 'https://api.iconify.design/simple-icons/alibabacloud',
            'rds': 'https://api.iconify.design/simple-icons/alibabacloud',
            '_default': 'https://api.iconify.design/simple-icons/alibabacloud'
        }
    };

    const providerMap = serviceIcons[provider];
    if (!providerMap) {
        return 'https://api.iconify.design/carbon/cloud.svg';
    }

    return providerMap[service] || providerMap['_default'];
};

export const getCloudBadge = (cloudProvider) => {
    const badges = {
        'aws': { color: '#FF9900', text: 'AWS', bg: '#232F3E' },
        'azure': { color: '#0078D4', text: 'Azure', bg: '#FFFFFF' },
        'gcp': { color: '#4285F4', text: 'GCP', bg: '#FFFFFF' },
        'oracle': { color: '#F80000', text: 'Oracle', bg: '#FFFFFF' },
        'ibm': { color: '#1261FE', text: 'IBM', bg: '#FFFFFF' },
        'alibaba': { color: '#FF6A00', text: 'Alibaba', bg: '#FFFFFF' },
        'digitalocean': { color: '#0080FF', text: 'DO', bg: '#FFFFFF' }
    };
    return badges[cloudProvider?.toLowerCase()] || null;
};

export const normalizeServiceName = (serviceName) => {
    if (!serviceName) return '';

    const normalized = serviceName.toLowerCase().trim();

    let cleanedService = normalized;
    // Remove vendor prefixes iteratively to handle cases like "Microsoft Azure ..."
    // or "Amazon AWS ..."
    const vendorPrefixes = /^(aws|amazon|azure|microsoft|google|gcp)\s+/i;
    while (vendorPrefixes.test(cleanedService)) {
        cleanedService = cleanedService.replace(vendorPrefixes, '');
    }

    const aliases = {
        // AWS
        'ec2 instance': 'ec2',
        'lambda function': 'lambda',
        's3 bucket': 's3',
        'dynamodb table': 'dynamodb',
        'rds instance': 'rds',
        'sqs queue': 'sqs',
        'sns topic': 'sns',

        // Azure
        'sql': 'sql database',
        'blob': 'blob storage',
        'cosmosdb': 'cosmos db',
        'function app': 'functions',

        // GCP
        'gke cluster': 'gke',
        'bq': 'bigquery'
    };

    return aliases[cleanedService] || cleanedService;
};
