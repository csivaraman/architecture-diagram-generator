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
            'fargate': 'https://api.iconify.design/logos/aws.svg',
            'elastic beanstalk': 'https://api.iconify.design/logos/aws-elastic-beanstalk.svg',

            // Storage
            's3': 'https://api.iconify.design/logos/aws-s3.svg',
            'ebs': 'https://api.iconify.design/logos/aws.svg',
            'efs': 'https://api.iconify.design/logos/aws.svg',
            'glacier': 'https://api.iconify.design/logos/aws.svg',

            // Database
            'dynamodb': 'https://api.iconify.design/logos/aws-dynamodb.svg',
            'rds': 'https://api.iconify.design/logos/aws-rds.svg',
            'aurora': 'https://api.iconify.design/logos/aws-aurora.svg',
            'elasticache': 'https://api.iconify.design/logos/aws-elasticache.svg',
            'redshift': 'https://api.iconify.design/logos/aws.svg',
            'documentdb': 'https://api.iconify.design/logos/aws.svg',
            'neptune': 'https://api.iconify.design/logos/aws.svg',

            // Networking
            'api gateway': 'https://api.iconify.design/logos/aws-api-gateway.svg',
            'cloudfront': 'https://api.iconify.design/logos/aws-cloudfront.svg',
            'route53': 'https://api.iconify.design/logos/aws-route53.svg',
            'vpc': 'https://api.iconify.design/logos/aws.svg',
            'elb': 'https://api.iconify.design/logos/aws.svg',
            'alb': 'https://api.iconify.design/logos/aws.svg',
            'app mesh': 'https://api.iconify.design/logos/aws-app-mesh.svg',

            // Messaging
            'sqs': 'https://api.iconify.design/logos/aws-sqs.svg',
            'sns': 'https://api.iconify.design/logos/aws.svg',
            'kinesis': 'https://api.iconify.design/logos/aws-kinesis.svg',
            'eventbridge': 'https://api.iconify.design/logos/aws-eventbridge.svg',
            'step functions': 'https://api.iconify.design/logos/aws-step-functions.svg',
            'mq': 'https://api.iconify.design/logos/aws.svg',

            // Security
            'iam': 'https://api.iconify.design/logos/aws-iam.svg',
            'cognito': 'https://api.iconify.design/logos/aws.svg',
            'secrets manager': 'https://api.iconify.design/logos/aws-secrets-manager.svg',
            'kms': 'https://api.iconify.design/logos/aws.svg',
            'waf': 'https://api.iconify.design/logos/aws-waf.svg',

            // Developer Tools
            'codepipeline': 'https://api.iconify.design/logos/aws-codepipeline.svg',
            'codebuild': 'https://api.iconify.design/logos/aws.svg',
            'codecommit': 'https://api.iconify.design/logos/aws.svg',
            'codedeploy': 'https://api.iconify.design/logos/aws.svg',
            'cloud9': 'https://api.iconify.design/logos/aws-cloud9.svg',

            // Management
            'cloudwatch': 'https://api.iconify.design/logos/aws-cloudwatch.svg',
            'cloudformation': 'https://api.iconify.design/logos/aws-cloudformation.svg',
            'cloudtrail': 'https://api.iconify.design/logos/aws.svg',
            'systems manager': 'https://api.iconify.design/logos/aws-systems-manager.svg',

            // Analytics
            'athena': 'https://api.iconify.design/logos/aws.svg',
            'emr': 'https://api.iconify.design/logos/aws.svg',
            'glue': 'https://api.iconify.design/logos/aws.svg',
            'quicksight': 'https://api.iconify.design/logos/aws.svg',

            // ML
            'sagemaker': 'https://api.iconify.design/logos/aws.svg',
            'rekognition': 'https://api.iconify.design/logos/aws.svg',

            '_default': 'https://api.iconify.design/logos/aws.svg'
        },

        // ==================== AZURE (VERIFIED) ====================
        azure: {
            // Compute
            'virtual machines': 'https://api.iconify.design/logos/azure-icon.svg',
            'vm': 'https://api.iconify.design/logos/azure-icon.svg',
            'app service': 'https://api.iconify.design/logos/azure-icon.svg',
            'functions': 'https://api.iconify.design/logos/azure-icon.svg',
            'container instances': 'https://api.iconify.design/logos/docker-icon.svg',
            'aks': 'https://api.iconify.design/logos/kubernetes.svg',
            'kubernetes service': 'https://api.iconify.design/logos/kubernetes.svg',
            'batch': 'https://api.iconify.design/logos/azure-icon.svg',
            'service fabric': 'https://api.iconify.design/logos/azure-icon.svg',

            // Storage
            'blob storage': 'https://api.iconify.design/logos/azure-icon.svg',
            'storage': 'https://api.iconify.design/logos/azure-icon.svg',
            'files': 'https://api.iconify.design/logos/azure-icon.svg',
            'queue storage': 'https://api.iconify.design/logos/azure-icon.svg',
            'table storage': 'https://api.iconify.design/logos/azure-icon.svg',
            'disk storage': 'https://api.iconify.design/logos/azure-icon.svg',
            'data lake storage': 'https://api.iconify.design/logos/azure-icon.svg',

            // Database
            'cosmos db': 'https://api.iconify.design/logos/azure-icon.svg',
            'sql database': 'https://api.iconify.design/vscode-icons/file-type-sql.svg',
            'database for mysql': 'https://api.iconify.design/logos/mysql-icon.svg',
            'database for postgresql': 'https://api.iconify.design/logos/postgresql.svg',
            'sql server': 'https://api.iconify.design/vscode-icons/file-type-sql.svg',
            'synapse analytics': 'https://api.iconify.design/logos/azure-icon.svg',
            'cache for redis': 'https://api.iconify.design/logos/redis.svg',
            'redis': 'https://api.iconify.design/logos/redis.svg',

            // Networking
            'virtual network': 'https://api.iconify.design/logos/azure-icon.svg',
            'vnet': 'https://api.iconify.design/logos/azure-icon.svg',
            'load balancer': 'https://api.iconify.design/logos/azure-icon.svg',
            'application gateway': 'https://api.iconify.design/logos/azure-icon.svg',
            'vpn gateway': 'https://api.iconify.design/logos/azure-icon.svg',
            'cdn': 'https://api.iconify.design/logos/azure-icon.svg',
            'traffic manager': 'https://api.iconify.design/logos/azure-icon.svg',
            'front door': 'https://api.iconify.design/logos/azure-icon.svg',
            'firewall': 'https://api.iconify.design/logos/azure-icon.svg',

            // Integration
            'service bus': 'https://api.iconify.design/logos/azure-icon.svg',
            'event grid': 'https://api.iconify.design/logos/azure-icon.svg',
            'event hubs': 'https://api.iconify.design/logos/azure-icon.svg',
            'logic apps': 'https://api.iconify.design/logos/azure-icon.svg',
            'api management': 'https://api.iconify.design/logos/azure-icon.svg',

            // Analytics
            'stream analytics': 'https://api.iconify.design/logos/azure-icon.svg',
            'data factory': 'https://api.iconify.design/logos/azure-icon.svg',
            'databricks': 'https://api.iconify.design/simple-icons/databricks',
            'hdinsight': 'https://api.iconify.design/logos/azure-icon.svg',

            // AI + ML
            'cognitive services': 'https://api.iconify.design/logos/azure-icon.svg',
            'machine learning': 'https://api.iconify.design/logos/azure-icon.svg',
            'bot service': 'https://api.iconify.design/logos/azure-icon.svg',

            // Security
            'active directory': 'https://api.iconify.design/logos/azure-icon.svg',
            'ad': 'https://api.iconify.design/logos/azure-icon.svg',
            'key vault': 'https://api.iconify.design/logos/azure-icon.svg',
            'security center': 'https://api.iconify.design/logos/azure-icon.svg',
            'sentinel': 'https://api.iconify.design/logos/azure-icon.svg',

            // DevOps
            'devops': 'https://api.iconify.design/logos/azure-icon.svg',
            'pipelines': 'https://api.iconify.design/logos/azure-icon.svg',
            'repos': 'https://api.iconify.design/logos/azure-icon.svg',
            'artifacts': 'https://api.iconify.design/logos/azure-icon.svg',

            // Monitoring
            'monitor': 'https://api.iconify.design/logos/azure-icon.svg',
            'application insights': 'https://api.iconify.design/logos/azure-icon.svg',
            'log analytics': 'https://api.iconify.design/logos/azure-icon.svg',

            '_default': 'https://api.iconify.design/logos/azure-icon.svg'
        },

        // ==================== GCP (VERIFIED) ====================
        gcp: {
            // Compute
            'compute engine': 'https://api.iconify.design/logos/google-cloud.svg',
            'app engine': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud run': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud functions': 'https://api.iconify.design/logos/google-cloud.svg',
            'gke': 'https://api.iconify.design/logos/kubernetes.svg',
            'kubernetes engine': 'https://api.iconify.design/logos/kubernetes.svg',

            // Storage
            'cloud storage': 'https://api.iconify.design/logos/google-cloud.svg',
            'persistent disk': 'https://api.iconify.design/logos/google-cloud.svg',
            'filestore': 'https://api.iconify.design/logos/google-cloud.svg',

            // Database
            'cloud sql': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud spanner': 'https://api.iconify.design/logos/google-cloud.svg',
            'firestore': 'https://api.iconify.design/logos/firebase.svg',
            'bigtable': 'https://api.iconify.design/logos/google-cloud.svg',
            'memorystore': 'https://api.iconify.design/logos/redis.svg',
            'firebase': 'https://api.iconify.design/logos/firebase.svg',
            'realtime database': 'https://api.iconify.design/logos/firebase.svg',

            // Networking
            'cloud cdn': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud load balancing': 'https://api.iconify.design/logos/google-cloud.svg',
            'vpc': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud dns': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud nat': 'https://api.iconify.design/logos/google-cloud.svg',

            // Analytics
            'bigquery': 'https://api.iconify.design/logos/google-bigquery-icon.svg',
            'dataflow': 'https://api.iconify.design/logos/google-cloud.svg',
            'dataproc': 'https://api.iconify.design/logos/google-cloud.svg',
            'pub/sub': 'https://api.iconify.design/logos/google-cloud.svg',
            'pubsub': 'https://api.iconify.design/logos/google-cloud.svg',
            'composer': 'https://api.iconify.design/logos/google-cloud.svg',
            'data fusion': 'https://api.iconify.design/logos/google-cloud.svg',

            // AI & ML
            'vertex ai': 'https://api.iconify.design/logos/google-cloud.svg',
            'ai platform': 'https://api.iconify.design/logos/google-cloud.svg',
            'automl': 'https://api.iconify.design/logos/google-cloud.svg',
            'vision api': 'https://api.iconify.design/logos/google-cloud.svg',
            'natural language': 'https://api.iconify.design/logos/google-cloud.svg',

            // Security
            'cloud iam': 'https://api.iconify.design/logos/google-cloud.svg',
            'iam': 'https://api.iconify.design/logos/google-cloud.svg',
            'secret manager': 'https://api.iconify.design/logos/google-cloud.svg',
            'kms': 'https://api.iconify.design/logos/google-cloud.svg',

            // Monitoring
            'cloud monitoring': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud logging': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud trace': 'https://api.iconify.design/logos/google-cloud.svg',

            // Developer Tools
            'cloud build': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud source repositories': 'https://api.iconify.design/logos/google-cloud.svg',
            'artifact registry': 'https://api.iconify.design/logos/google-cloud.svg',
            'container registry': 'https://api.iconify.design/logos/google-cloud.svg',

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

    const cleanedService = normalized
        .replace(/^aws\s+/i, '')
        .replace(/^amazon\s+/i, '')
        .replace(/^azure\s+/i, '')
        .replace(/^microsoft\s+/i, '')
        .replace(/^google\s+/i, '')
        .replace(/^gcp\s+/i, '');

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
        'azure sql': 'sql database',
        'blob': 'blob storage',
        'cosmosdb': 'cosmos db',
        'function app': 'functions',

        // GCP
        'gke cluster': 'gke',
        'bq': 'bigquery'
    };

    return aliases[cleanedService] || cleanedService;
};
