
import { describe, it, expect } from 'vitest';
import { getCloudIcon, normalizeServiceName } from '../../utils/cloudIcons';

describe('Service Recognition & Icon Rendering', () => {

    const expectations = {
        // AWS
        aws_ecommerce_platform: {
            provider: 'aws',
            services: ['api gateway', 'lambda', 'dynamodb', 'aurora', 's3', 'elasticache', 'sqs', 'sns', 'cloudwatch', 'cognito']
        },
        aws_data_analytics: {
            provider: 'aws',
            services: ['kinesis', 'lambda', 's3', 'glue', 'athena', 'redshift', 'quicksight', 'cloudwatch', 'step functions']
        },
        aws_container_microservices: {
            provider: 'aws',
            services: ['eks', 'ecr', 'alb', 'rds', 'documentdb', 'elasticache', 'cloudfront', 'route53']
        },
        aws_iot_platform: {
            provider: 'aws',
            services: ['iot core', 'lambda', 'kinesis', 'dynamodb', 'timestream', 'sagemaker', 'sns', 'cloudwatch']
        },
        aws_ml_pipeline: {
            provider: 'aws',
            services: ['sagemaker', 's3', 'lambda', 'api gateway', 'dynamodb', 'step functions', 'ecr', 'cloudwatch']
        },

        // Azure
        azure_enterprise_app: {
            provider: 'azure',
            services: ['app service', 'functions', 'cosmos db', 'sql database', 'blob storage', 'service bus', 'redis', 'application insights', 'active directory']
        },
        azure_data_platform: {
            provider: 'azure',
            services: ['data factory', 'databricks', 'synapse analytics', 'blob storage', 'event hubs', 'stream analytics', 'power bi', 'key vault']
        },
        azure_kubernetes_platform: {
            provider: 'azure',
            services: ['aks', 'container registry', 'application gateway', 'cosmos db', 'database for postgresql', 'service bus', 'monitor', 'devops']
        },
        azure_serverless: {
            provider: 'azure',
            services: ['functions', 'event grid', 'logic apps', 'cosmos db', 'blob storage', 'queue storage', 'api management services', 'application insights']
        },
        azure_ai_platform: {
            provider: 'azure',
            services: ['machine learning', 'cognitive services', 'bot service', 'blob storage', 'cosmos db', 'functions', 'api management services', 'monitor']
        },

        // GCP
        gcp_microservices_platform: {
            provider: 'gcp',
            services: ['cloud run', 'cloud load balancing', 'cloud sql', 'firestore', 'cloud storage', 'pub/sub', 'cloud functions', 'cloud monitoring']
        },
        gcp_data_analytics_pipeline: {
            provider: 'gcp',
            services: ['bigquery', 'dataflow', 'pub/sub', 'cloud storage', 'dataproc', 'data fusion', 'looker', 'cloud logging']
        },
        gcp_gaming_backend: {
            provider: 'gcp',
            services: ['cloud run', 'memorystore', 'cloud spanner', 'firestore', 'cloud storage', 'pub/sub', 'cloud functions', 'cloud cdn']
        },
        gcp_ml_platform: {
            provider: 'gcp',
            services: ['vertex ai', 'cloud storage', 'bigquery', 'dataflow', 'cloud functions', 'pub/sub', 'cloud monitoring']
        },
        gcp_realtime_app: {
            provider: 'gcp',
            services: ['cloud run', 'realtime database', 'firestore', 'cloud storage', 'cloud functions', 'firebase', 'pub/sub', 'cloud trace']
        },

        // Multi-Cloud (We check each provider's service)
        // For hybrid/multi-cloud, the prompt lists services from different providers. 
        // We will assume the component has the correct provider tagged.
        // We can test simply that the services exist in their respective provider maps.
        multi_cloud_data_sync: {
            scenarios: [
                { provider: 'aws', service: 's3' },
                { provider: 'azure', service: 'blob storage' },
                { provider: 'gcp', service: 'bigquery' },
                { provider: 'aws', service: 'lambda' },
                { provider: 'azure', service: 'functions' },
                { provider: 'gcp', service: 'cloud monitoring' }
            ]
        },
        hybrid_ecommerce: {
            scenarios: [
                { provider: 'aws', service: 'rds' },
                { provider: 'azure', service: 'cosmos db' },
                { provider: 'gcp', service: 'cloud storage' },
                { provider: 'aws', service: 'api gateway' },
                { provider: 'azure', service: 'service bus' }
            ]
        },
        multi_cloud_analytics_platform: {
            scenarios: [
                { provider: 'aws', service: 'kinesis' },
                { provider: 'azure', service: 'event hubs' },
                { provider: 'gcp', service: 'bigquery' },
                { provider: 'aws', service: 'glue' },
                { provider: 'azure', service: 'data factory' }
            ]
        },
        global_multi_cloud_app: {
            scenarios: [
                { provider: 'aws', service: 'lambda' },
                { provider: 'azure', service: 'app service' },
                { provider: 'gcp', service: 'cloud run' },
                { provider: 'azure', service: 'traffic manager' },
                { provider: 'aws', service: 'route53' }
            ]
        },
        hybrid_ai_platform: {
            scenarios: [
                { provider: 'aws', service: 'sagemaker' },
                { provider: 'azure', service: 'cognitive services' },
                { provider: 'gcp', service: 'vertex ai' },
                { provider: 'aws', service: 's3' },
                { provider: 'azure', service: 'blob storage' }
            ]
        },

        // Specialized
        specialized_video_streaming: {
            provider: 'aws',
            services: ['cloudfront', 's3', 'mediaconvert', 'lambda', 'dynamodb', 'elasticache', 'api gateway', 'cognito', 'cloudwatch']
        },
        specialized_healthcare: {
            provider: 'azure',
            services: ['app service', 'sql database', 'blob storage', 'functions', 'service bus', 'key vault', 'security center']
            // Note: 'Health Data Services' might be missing
        },
        specialized_fintech: {
            provider: 'gcp',
            services: ['cloud run', 'cloud spanner', 'pub/sub', 'bigquery', 'kms', 'secret manager', 'cloud armor', 'cloud logging']
        },
        specialized_social_media: {
            provider: 'aws',
            services: ['api gateway', 'lambda', 'dynamodb', 'elasticache', 's3', 'cloudfront', 'rekognition', 'kinesis', 'neptune']
        },
        specialized_manufacturing_iot: {
            provider: 'azure',
            services: ['iot hub', 'stream analytics', 'cosmos db', 'blob storage', 'functions', 'event grid', 'power bi']
            // 'Digital Twins', 'Time Series Insights' might be missing
        }
    };

    Object.entries(expectations).forEach(([key, config]) => {
        describe(`Scenario: ${key}`, () => {
            if (config.scenarios) {
                // Multi-cloud handling
                config.scenarios.forEach(({ provider, service }) => {
                    it(`should recognize ${provider} ${service}`, () => {
                        const normalized = normalizeServiceName(service);
                        const icon = getCloudIcon(provider, normalized);
                        const defaultIcon = getCloudIcon(provider, 'non_existent_service_xyz');
                        expect(icon, `Icon for ${provider}:${service} should not be default`).not.toBe(defaultIcon);
                    });
                });
            } else {
                // Single cloud handling
                config.services.forEach(service => {
                    it(`should recognize ${service}`, () => {
                        const normalized = normalizeServiceName(service);
                        const icon = getCloudIcon(config.provider, normalized);
                        const defaultIcon = getCloudIcon(config.provider, 'non_existent_service_xyz');
                        expect(icon, `Icon for ${service} should not be default`).not.toBe(defaultIcon);
                    });
                });
            }
        });
    });

});
