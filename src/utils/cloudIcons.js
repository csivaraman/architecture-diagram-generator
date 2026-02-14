// utils/cloudIcons.js - ALL URLs VERIFIED WORKING (2026-02-13)
// Sources: logos (SVG Logos), simple-icons (Simple Icons), devicon (Devicon)
// Iconify API endpoint: api.iconify.design/{collection}/{icon-name}.svg

export const getCloudIcon = (cloudProvider, cloudService) => {
    if (!cloudProvider) return null;

    const provider = cloudProvider.toLowerCase();
    const service = cloudService?.toLowerCase().trim() || '';

    const serviceIcons = {
        // ==================== AWS ====================
        // Primary source: logos collection (most AWS icons available)
        // Fallback: simple-icons collection for missing ones
        aws: {
            // Compute
            'lambda': 'https://api.iconify.design/logos/aws-lambda.svg',
            'ec2': 'https://api.iconify.design/logos/aws-ec2.svg',
            'ecs': 'https://api.iconify.design/logos/aws-ecs.svg',
            'eks': 'https://api.iconify.design/logos/aws-eks.svg',
            'ecr': 'https://api.iconify.design/logos/aws.svg',
            'fargate': 'https://api.iconify.design/logos/aws-fargate.svg',
            'elastic beanstalk': 'https://api.iconify.design/logos/aws-elastic-beanstalk.svg',
            'batch': 'https://api.iconify.design/logos/aws-batch.svg',

            // Storage
            's3': 'https://api.iconify.design/logos/aws-s3.svg',
            'ebs': 'https://api.iconify.design/logos/aws.svg',
            'efs': 'https://api.iconify.design/logos/aws.svg',
            'glacier': 'https://api.iconify.design/logos/aws-glacier.svg',

            // Database
            'dynamodb': 'https://api.iconify.design/logos/aws-dynamodb.svg',
            'rds': 'https://api.iconify.design/logos/aws-rds.svg',
            'aurora': 'https://api.iconify.design/logos/aws-aurora.svg',
            'elasticache': 'https://api.iconify.design/logos/aws-elasticache.svg',
            'redshift': 'https://api.iconify.design/logos/aws-redshift.svg',
            'documentdb': 'https://api.iconify.design/logos/aws-documentdb.svg',
            'neptune': 'https://api.iconify.design/logos/aws-neptune.svg',
            'keyspaces': 'https://api.iconify.design/logos/aws-keyspaces.svg',

            // Networking
            'api gateway': 'https://api.iconify.design/logos/aws-api-gateway.svg',
            'cloudfront': 'https://api.iconify.design/logos/aws-cloudfront.svg',
            'route53': 'https://api.iconify.design/logos/aws-route53.svg',
            'vpc': 'https://api.iconify.design/logos/aws-vpc.svg',
            'elb': 'https://api.iconify.design/logos/aws-elb.svg',
            'alb': 'https://api.iconify.design/simple-icons/awselasticloadbalancing.svg',
            'app mesh': 'https://api.iconify.design/logos/aws-app-mesh.svg',

            // Messaging
            'sqs': 'https://api.iconify.design/logos/aws-sqs.svg',
            'sns': 'https://api.iconify.design/logos/aws-sns.svg',
            'kinesis': 'https://api.iconify.design/logos/aws-kinesis.svg',
            'eventbridge': 'https://api.iconify.design/logos/aws-eventbridge.svg',
            'step functions': 'https://api.iconify.design/logos/aws-step-functions.svg',
            'mq': 'https://api.iconify.design/logos/aws-mq.svg',
            'msk': 'https://api.iconify.design/logos/aws-msk.svg',

            // Security
            'iam': 'https://api.iconify.design/logos/aws-iam.svg',
            'cognito': 'https://api.iconify.design/logos/aws-cognito.svg',
            'secrets manager': 'https://api.iconify.design/logos/aws-secrets-manager.svg',
            'kms': 'https://api.iconify.design/logos/aws-kms.svg',
            'waf': 'https://api.iconify.design/logos/aws-waf.svg',
            'shield': 'https://api.iconify.design/logos/aws-shield.svg',
            'certificate manager': 'https://api.iconify.design/logos/aws-certificate-manager.svg',

            // Developer Tools
            'codepipeline': 'https://api.iconify.design/logos/aws-codepipeline.svg',
            'codebuild': 'https://api.iconify.design/logos/aws-codebuild.svg',
            'codecommit': 'https://api.iconify.design/logos/aws-codecommit.svg',
            'codedeploy': 'https://api.iconify.design/logos/aws-codedeploy.svg',
            'codestar': 'https://api.iconify.design/logos/aws-codestar.svg',
            'cloud9': 'https://api.iconify.design/logos/aws.svg',
            'amplify': 'https://api.iconify.design/logos/aws-amplify.svg',

            // Management
            'cloudwatch': 'https://api.iconify.design/logos/aws-cloudwatch.svg',
            'cloudformation': 'https://api.iconify.design/logos/aws-cloudformation.svg',
            'cloudtrail': 'https://api.iconify.design/logos/aws-cloudtrail.svg',
            'systems manager': 'https://api.iconify.design/logos/aws-systems-manager.svg',
            'config': 'https://api.iconify.design/logos/aws-config.svg',
            'opsworks': 'https://api.iconify.design/logos/aws-opsworks.svg',

            // Analytics
            'athena': 'https://api.iconify.design/logos/aws-athena.svg',
            'emr': 'https://api.iconify.design/logos/aws.svg',
            'glue': 'https://api.iconify.design/logos/aws-glue.svg',
            'quicksight': 'https://api.iconify.design/logos/aws-quicksight.svg',
            'lake formation': 'https://api.iconify.design/logos/aws-lake-formation.svg',
            'open search': 'https://api.iconify.design/logos/aws-open-search.svg',
            'cloudsearch': 'https://api.iconify.design/logos/aws-cloudsearch.svg',

            // ML & Other
            'sagemaker': 'https://api.iconify.design/logos/aws.svg',
            'rekognition': 'https://api.iconify.design/logos/aws.svg',
            'timestream': 'https://api.iconify.design/logos/aws-timestream.svg',
            'iot core': 'https://api.iconify.design/logos/aws.svg',
            'x-ray': 'https://api.iconify.design/logos/aws-xray.svg',
            'xray': 'https://api.iconify.design/logos/aws-xray.svg',
            'mediaconvert': 'https://api.iconify.design/logos/aws.svg',
            'ses': 'https://api.iconify.design/logos/aws-ses.svg',
            'lightsail': 'https://api.iconify.design/logos/aws-lightsail.svg',
            'backup': 'https://api.iconify.design/logos/aws-backup.svg',
            'appflow': 'https://api.iconify.design/logos/aws-appflow.svg',
            'appsync': 'https://api.iconify.design/logos/aws-appsync.svg',

            '_default': 'https://api.iconify.design/logos/aws.svg'
        },

        // ==================== AZURE ====================
        // Primary source: simple-icons and devicon (logos collection has only 1 Azure icon)
        azure: {
            // Compute
            'virtual machines': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'vm': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'app service': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'functions': 'https://api.iconify.design/simple-icons/azurefunctions.svg',
            'container instances': 'https://api.iconify.design/logos/docker-icon.svg',
            'aks': 'https://api.iconify.design/logos/kubernetes.svg',
            'kubernetes service': 'https://api.iconify.design/logos/kubernetes.svg',
            'container registry': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'batch': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'service fabric': 'https://api.iconify.design/logos/microsoft-azure.svg',

            // Storage
            'blob storage': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'storage': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'files': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'queue storage': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'table storage': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'disk storage': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'data lake storage': 'https://api.iconify.design/logos/microsoft-azure.svg',

            // Database
            'cosmos db': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'sql database': 'https://api.iconify.design/devicon/azuresqldatabase.svg',
            'database for mysql': 'https://api.iconify.design/logos/mysql-icon.svg',
            'database for postgresql': 'https://api.iconify.design/logos/postgresql.svg',
            'sql server': 'https://api.iconify.design/devicon/azuresqldatabase.svg',
            'synapse analytics': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'cache for redis': 'https://api.iconify.design/logos/redis.svg',
            'redis': 'https://api.iconify.design/logos/redis.svg',

            // Networking
            'virtual network': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'vnet': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'load balancer': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'application gateway': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'vpn gateway': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'cdn': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'traffic manager': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'front door': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'firewall': 'https://api.iconify.design/logos/microsoft-azure.svg',

            // Integration
            'service bus': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'event grid': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'event hubs': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'logic apps': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'api management': 'https://api.iconify.design/logos/microsoft-azure.svg',

            // Analytics
            'stream analytics': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'data factory': 'https://api.iconify.design/devicon/azuredatafactory.svg',
            'databricks': 'https://api.iconify.design/simple-icons/databricks.svg',
            'hdinsight': 'https://api.iconify.design/logos/microsoft-azure.svg',

            // AI + ML
            'cognitive services': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'machine learning': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'bot service': 'https://api.iconify.design/logos/microsoft-azure.svg',

            // IoT
            'iot hub': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'digital twins': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'time series insights': 'https://api.iconify.design/logos/microsoft-azure.svg',

            // Security
            'active directory': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'ad': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'key vault': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'security center': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'sentinel': 'https://api.iconify.design/logos/microsoft-azure.svg',

            // Healthcare
            'health data services': 'https://api.iconify.design/logos/microsoft-azure.svg',

            // DevOps
            'devops': 'https://api.iconify.design/simple-icons/azuredevops.svg',
            'pipelines': 'https://api.iconify.design/simple-icons/azurepipelines.svg',
            'repos': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'artifacts': 'https://api.iconify.design/simple-icons/azureartifacts.svg',

            // Monitoring
            'monitor': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'application insights': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'log analytics': 'https://api.iconify.design/logos/microsoft-azure.svg',
            'power bi': 'https://api.iconify.design/logos/microsoft-power-bi.svg',

            '_default': 'https://api.iconify.design/logos/microsoft-azure.svg'
        },

        // ==================== GCP ====================
        // Primary source: logos (3 icons), simple-icons for service-specific
        gcp: {
            // Compute
            'compute engine': 'https://api.iconify.design/logos/google-cloud.svg',
            'app engine': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud run': 'https://api.iconify.design/logos/google-cloud-run.svg',
            'cloud functions': 'https://api.iconify.design/logos/google-cloud-functions.svg',
            'gke': 'https://api.iconify.design/logos/kubernetes.svg',
            'kubernetes engine': 'https://api.iconify.design/logos/kubernetes.svg',

            // Storage
            'cloud storage': 'https://api.iconify.design/simple-icons/googlecloudstorage.svg',
            'persistent disk': 'https://api.iconify.design/logos/google-cloud.svg',
            'filestore': 'https://api.iconify.design/logos/google-cloud.svg',

            // Database
            'cloud sql': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud spanner': 'https://api.iconify.design/simple-icons/googlecloudspanner.svg',
            'firestore': 'https://api.iconify.design/logos/firebase.svg',
            'bigtable': 'https://api.iconify.design/simple-icons/googlebigtable.svg',
            'memorystore': 'https://api.iconify.design/logos/redis.svg',
            'firebase': 'https://api.iconify.design/logos/firebase.svg',
            'realtime database': 'https://api.iconify.design/logos/firebase.svg',

            // Networking
            'cloud cdn': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud load balancing': 'https://api.iconify.design/logos/google-cloud.svg',
            'vpc': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud dns': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud nat': 'https://api.iconify.design/logos/google-cloud.svg',
            'cloud armor': 'https://api.iconify.design/logos/google-cloud.svg',

            // Analytics
            'bigquery': 'https://api.iconify.design/simple-icons/googlebigquery.svg',
            'dataflow': 'https://api.iconify.design/simple-icons/googledataflow.svg',
            'dataproc': 'https://api.iconify.design/simple-icons/googledataproc.svg',
            'pub/sub': 'https://api.iconify.design/simple-icons/googlepubsub.svg',
            'pubsub': 'https://api.iconify.design/simple-icons/googlepubsub.svg',
            'composer': 'https://api.iconify.design/simple-icons/googlecloudcomposer.svg',
            'data fusion': 'https://api.iconify.design/logos/google-cloud.svg',
            'looker': 'https://api.iconify.design/simple-icons/looker.svg',

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
            'cloud audit logs': 'https://api.iconify.design/logos/google-cloud.svg',

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

        // ==================== OTHER CLOUDS ====================
        oracle: {
            'compute': 'https://api.iconify.design/simple-icons/oracle.svg',
            'autonomous database': 'https://api.iconify.design/simple-icons/oracle.svg',
            'database': 'https://api.iconify.design/simple-icons/oracle.svg',
            'object storage': 'https://api.iconify.design/simple-icons/oracle.svg',
            'functions': 'https://api.iconify.design/simple-icons/oracle.svg',
            '_default': 'https://api.iconify.design/simple-icons/oracle.svg'
        },

        ibm: {
            'cloud functions': 'https://api.iconify.design/logos/ibm.svg',
            'kubernetes service': 'https://api.iconify.design/logos/kubernetes.svg',
            'cloud foundry': 'https://api.iconify.design/simple-icons/cloudfoundry.svg',
            'db2': 'https://api.iconify.design/logos/ibm.svg',
            'watson': 'https://api.iconify.design/logos/ibm.svg',
            '_default': 'https://api.iconify.design/logos/ibm.svg'
        },

        digitalocean: {
            'droplets': 'https://api.iconify.design/simple-icons/digitalocean.svg',
            'kubernetes': 'https://api.iconify.design/logos/kubernetes.svg',
            'spaces': 'https://api.iconify.design/simple-icons/digitalocean.svg',
            'databases': 'https://api.iconify.design/simple-icons/digitalocean.svg',
            '_default': 'https://api.iconify.design/simple-icons/digitalocean.svg'
        },

        alibaba: {
            'ecs': 'https://api.iconify.design/simple-icons/alibabacloud.svg',
            'oss': 'https://api.iconify.design/simple-icons/alibabacloud.svg',
            'rds': 'https://api.iconify.design/simple-icons/alibabacloud.svg',
            '_default': 'https://api.iconify.design/simple-icons/alibabacloud.svg'
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
