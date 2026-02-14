export const testPrompts = {
    // AWS Scenarios (10)
    aws_simple: "Simple S3 to Lambda to DynamoDB pipeline",
    aws_serverless: "Serverless web app with API Gateway, Lambda, and DynamoDB",
    aws_containers: "Microservices on ECS with Fargate and ALB",
    aws_database: "RDS Aurora cluster with read replicas and ElastiCache",
    aws_analytics: "Big data pipeline with Kinesis, Glue, and Redshift",
    aws_ml: "Machine learning workflow with SageMaker and S3",
    aws_networking: "VPC with public/private subnets, NAT Gateway, and VPN",
    aws_security: "Security architecture with WAF, Shield, and GuardDuty",
    aws_storage: "Storage gateway with S3 and Glacier for archival",
    aws_iot: "IoT core processing with Kinesis Firehose and Timestream",

    // Azure Scenarios (8)
    azure_web: "Azure Web App with SQL Database and Redis Cache",
    azure_functions: "Event-driven architecture with Azure Functions and Event Grid",
    azure_aks: "Kubernetes cluster on AKS with Azure Container Registry",
    azure_cosmos: "Global data distribution with Cosmos DB and Traffic Manager",
    azure_storage: "Blob storage with CDN and Azure Cognitive Search",
    azure_logic_apps: "Integration workflow with Logic Apps and Service Bus",
    azure_iot: "IoT Hub telemetery processing with Stream Analytics",
    azure_active_directory: "Identity management with Azure AD and B2C",

    // GCP Scenarios (8)
    gcp_run: "Containerized app on Cloud Run with Firestore",
    gcp_kubernetes: "GKE cluster with Cloud Build and Artifact Registry",
    gcp_dataflow: "Streaming analytics with Pub/Sub, Dataflow, and BigQuery",
    gcp_functions: "Cloud Functions triggered by Cloud Storage events",
    gcp_sql: "Cloud SQL with HA and Cloud Memcache",
    gcp_ml: "Vertex AI pipeline with Cloud Storage",
    gcp_app_engine: "Standard environment app with Cloud Tasks",
    gcp_networking: "Global load balancing with Cloud CDN and Armor",

    // Multi-Cloud & Hybrid (5)
    hybrid_vpn: "On-premise data center connected to AWS via Site-to-Site VPN",
    multi_cloud_storage: "App on AWS using Google Cloud Storage for backup",
    multi_cloud_k8s: "Kubernetes clusters across Azure AKS and AWS EKS",
    hybrid_database: "On-prem legacy DB replicating to Cloud SQL",
    multi_cloud_analytics: "Data ingestion from Azure Event Hubs to BigQuery",

    // Edge Cases (4)
    edge_overcrowded: "Complex system with 20+ interconnected microservices",
    edge_loops: "Circular dependency between three recursive services",
    edge_long_labels: "Services with extremely long descriptions and names",
    edge_disconnected: "Isolated components with no connections to main system",

    // =========================================================================
    // NEW AWS SCENARIOS (1-5)
    // =========================================================================
    aws_ecommerce_platform: "Build a scalable e-commerce platform on AWS using API Gateway for request routing, Lambda functions for order processing and inventory management, DynamoDB for product catalog and user sessions, Aurora PostgreSQL for transactional data, S3 for product images, ElastiCache Redis for caching, SQS for order queue management, SNS for notifications, and CloudWatch for monitoring. Include Cognito for user authentication.",
    aws_data_analytics: "Design a real-time data analytics system on AWS with Kinesis Data Streams for event ingestion, Lambda for stream processing, S3 for data lake storage, Glue for ETL jobs, Athena for ad-hoc queries, Redshift for data warehousing, QuickSight for visualization, and CloudWatch for logging. Use Step Functions to orchestrate the pipeline.",
    aws_container_microservices: "Create a microservices architecture using EKS for container orchestration, ECR for container registry, Application Load Balancer for traffic distribution, RDS MySQL for relational data, DocumentDB for document storage, ElastiCache for session management, CloudFront for CDN, Route53 for DNS, and X-Ray for distributed tracing.",
    aws_iot_platform: "Build an IoT data processing platform with IoT Core for device connectivity, Lambda for data transformation, Kinesis Firehose for streaming to S3, DynamoDB for device metadata, Timestream for time-series data, SageMaker for ML predictions, SNS for alerts, and CloudWatch for monitoring device health.",
    aws_ml_pipeline: "Design an ML training and inference pipeline using SageMaker for model training, S3 for dataset storage, Lambda for preprocessing, API Gateway for model serving, DynamoDB for feature store, Step Functions for workflow orchestration, ECR for custom containers, and CloudWatch for model monitoring.",

    // =========================================================================
    // NEW AZURE SCENARIOS (6-10)
    // =========================================================================
    azure_enterprise_app: "Build an enterprise web application on Azure using App Service for hosting, Azure Functions for background processing, Cosmos DB for global user profiles, SQL Database for transactional data, Blob Storage for media files, Service Bus for messaging, Azure Cache for Redis for session state, Application Insights for monitoring, and Active Directory for authentication.",
    azure_data_platform: "Create a modern data platform with Azure Data Factory for ETL pipelines, Databricks for big data processing, Synapse Analytics for data warehousing, Blob Storage for data lake, Event Hubs for real-time ingestion, Stream Analytics for real-time processing, and Power BI for visualization. Include Key Vault for secrets management.",
    azure_kubernetes_platform: "Design a cloud-native application using AKS for container orchestration, Container Registry for images, Application Gateway for ingress, Cosmos DB for distributed data, Azure Database for PostgreSQL for relational data, Service Bus for messaging, Azure Monitor for observability, and Azure DevOps for CI/CD pipelines.",
    azure_serverless: "Build a serverless event-driven system with Azure Functions for compute, Event Grid for event routing, Logic Apps for workflows, Cosmos DB for NoSQL storage, Blob Storage for files, Queue Storage for async processing, API Management for API gateway, and Application Insights for telemetry.",
    azure_ai_platform: "Create an AI platform using Azure Machine Learning for model training, Cognitive Services for pre-built AI, Bot Service for conversational AI, Blob Storage for training data, Cosmos DB for conversation history, Functions for inference endpoints, API Management for serving, and Monitor for performance tracking.",

    // =========================================================================
    // NEW GCP SCENARIOS (11-15)
    // =========================================================================
    gcp_microservices_platform: "Design a microservices platform on GCP with Cloud Run for containerized services, Cloud Load Balancing for traffic distribution, Cloud SQL for PostgreSQL database, Firestore for real-time data, Cloud Storage for object storage, Pub/Sub for event streaming, Cloud Functions for event processing, and Cloud Monitoring for observability.",
    gcp_data_analytics_pipeline: "Build a data analytics pipeline using BigQuery for data warehouse, Dataflow for stream and batch processing, Pub/Sub for message ingestion, Cloud Storage for data lake, Dataproc for Spark jobs, Data Fusion for visual ETL, Looker for BI dashboards, and Cloud Logging for audit trails.",
    gcp_gaming_backend: "Create a gaming backend with Cloud Run for game servers, Memorystore Redis for session caching, Cloud Spanner for global leaderboards, Firestore for player profiles, Cloud Storage for game assets, Pub/Sub for matchmaking queue, Cloud Functions for notifications, and Cloud CDN for content delivery.",
    gcp_ml_platform: "Design an ML platform using Vertex AI for model training and deployment, Cloud Storage for datasets, BigQuery for feature engineering, Dataflow for data preprocessing, Cloud Functions for inference triggers, Pub/Sub for prediction requests, and Cloud Monitoring for model performance tracking.",
    gcp_realtime_app: "Build a real-time collaboration app with Cloud Run for API backend, Firebase Realtime Database for live sync, Cloud Firestore for structured data, Cloud Storage for file uploads, Cloud Functions for serverless logic, Firebase Authentication for users, Pub/Sub for notifications, and Cloud Trace for performance monitoring.",

    // =========================================================================
    // NEW MULTI-CLOUD / HYBRID SCENARIOS (16-20)
    // =========================================================================
    multi_cloud_data_sync: "Design a multi-cloud architecture with AWS S3 for primary storage, Azure Blob Storage for backup and disaster recovery, GCP BigQuery for analytics, AWS Lambda for data transformation, Azure Functions for replication logic, and GCP Cloud Monitoring for unified observability across clouds.",
    hybrid_ecommerce: "Create a hybrid e-commerce system with on-premises SQL Server for legacy order management, AWS RDS for new customer data, Azure Cosmos DB for global product catalog, GCP Cloud Storage for media assets, AWS API Gateway for public API, Azure Service Bus for inter-system messaging, and hybrid monitoring with CloudWatch and Azure Monitor.",
    multi_cloud_analytics_platform: "Build a cross-cloud analytics platform with AWS Kinesis for data ingestion, Azure Event Hubs for additional streams, GCP BigQuery as central data warehouse, AWS Glue for ETL, Azure Data Factory for orchestration, GCP Looker for visualization, and unified logging with AWS CloudWatch and GCP Cloud Logging.",
    global_multi_cloud_app: "Design a globally distributed app with AWS in North America (Lambda, DynamoDB, CloudFront), Azure in Europe (App Service, Cosmos DB, Front Door), GCP in Asia (Cloud Run, Firestore, Cloud CDN), and Traffic Manager for global routing. Include AWS Route53 for DNS and cross-cloud replication.",
    hybrid_ai_platform: "Create a hybrid AI system with on-premises data centers for sensitive data, AWS SageMaker for model training, Azure Cognitive Services for pre-built AI capabilities, GCP Vertex AI for production inference, AWS S3 for model artifacts, Azure Blob for datasets, and unified monitoring across all environments.",

    // =========================================================================
    // NEW SPECIALIZED ARCHITECTURE SCENARIOS (21-25)
    // =========================================================================
    specialized_video_streaming: "Build a video streaming service with CloudFront for CDN, S3 for video storage, MediaConvert for transcoding, Lambda for thumbnail generation, DynamoDB for metadata, ElastiCache for recommendations, API Gateway for REST API, Cognito for user authentication, and CloudWatch for viewer analytics.",
    specialized_healthcare: "Design a HIPAA-compliant healthcare system with Azure Health Data Services for FHIR storage, App Service for patient portal, SQL Database for scheduling, Blob Storage for medical imaging, Functions for HL7 message processing, Service Bus for system integration, Key Vault for encryption keys, and Security Center for compliance monitoring.",
    specialized_fintech: "Create a fintech platform with Cloud Run for transaction processing, Cloud Spanner for global consistency, Pub/Sub for real-time events, BigQuery for fraud detection analytics, Cloud KMS for encryption, Secret Manager for credentials, Cloud Armor for DDoS protection, and Cloud Audit Logs for compliance.",
    specialized_social_media: "Build a social media platform with API Gateway for API management, Lambda for feed generation, DynamoDB for posts and likes, ElastiCache Redis for trending topics, S3 for media uploads, CloudFront for content delivery, Rekognition for image moderation, Kinesis for activity streams, and Neptune for social graph.",
    specialized_manufacturing_iot: "Design an industrial IoT system with IoT Hub for device connectivity, Stream Analytics for real-time monitoring, Time Series Insights for sensor data, Cosmos DB for device twins, Blob Storage for telemetry archive, Functions for alert processing, Event Grid for event routing, Digital Twins for factory modeling, and Power BI for dashboards."
};
