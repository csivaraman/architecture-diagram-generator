/**
 * 25 Test Cases for Cloud Solution Architecture Diagram Generator
 * 
 * Simple integration - just import and loop through these test cases
 * Each test case has a description that can be fed directly to your existing Gemini API
 */

export const architectureTestCases = [
    // =========================================================================
    // E-COMMERCE & RETAIL (3 cases)
    // =========================================================================
    {
        id: 'TC001',
        category: 'E-commerce',
        name: 'Multi-Vendor E-commerce Platform',
        description: `Design a cloud-based multi-vendor e-commerce platform. Requirements: Customer web and mobile apps for browsing products across multiple vendors. Vendor portal for managing inventory and orders. Admin dashboard for platform management. Product search using Elasticsearch. Payment processing via Stripe and PayPal. Image storage in AWS S3. Order management with RabbitMQ for async processing. PostgreSQL for transactional data. Redis for caching product details and sessions. Email notifications for order updates. RESTful APIs for frontend-backend communication. Support for 10,000+ concurrent users.`
    },

    {
        id: 'TC002',
        category: 'Retail',
        name: 'Omnichannel Retail System',
        description: `Build an omnichannel retail management system. Requirements: Point-of-sale system for physical stores. E-commerce website and mobile app for online shopping. Centralized inventory management across all channels. Real-time inventory sync using Redis. Buy online, pickup in store (BOPIS) capability. Customer loyalty program with points tracking. Store employee scheduling system. MySQL for transactional data. MongoDB for product catalog. Integration with shipping providers (FedEx, UPS). Store locator using geospatial queries. Sales analytics dashboard. Support for 100+ store locations.`
    },

    {
        id: 'TC003',
        category: 'E-commerce',
        name: 'Subscription Box Service',
        description: `Create a subscription box delivery platform. Requirements: Customer portal for managing subscriptions (create, pause, cancel). Recurring billing system with Stripe Billing. Product curation engine with personalization. Shipment tracking and notifications. Subscription analytics dashboard. Referral program management. Email marketing automation with Mailchimp. PostgreSQL for customer and subscription data. Redis for session management. AWS S3 for product images. Celery for background job processing. Support for monthly, quarterly, annual subscriptions.`
    },

    // =========================================================================
    // HEALTHCARE & MEDICAL (3 cases)
    // =========================================================================
    {
        id: 'TC004',
        category: 'Healthcare',
        name: 'Electronic Health Records System',
        description: `Design a HIPAA-compliant EHR system. Requirements: Patient portal for viewing medical records and test results. Provider portal for doctors to manage patient records. E-prescribing system with pharmacy integration. Lab results integration using HL7/FHIR standards. Medical imaging viewer for DICOM images. Appointment scheduling with calendar sync. Billing and insurance claims processing. Clinical decision support with alerts. PostgreSQL for patient records. MongoDB for clinical notes. Elasticsearch for searching records. End-to-end encryption for PHI. Audit logging for compliance. Role-based access control. Support for 50,000+ patients.`
    },

    {
        id: 'TC005',
        category: 'Healthcare',
        name: 'Telemedicine Platform',
        description: `Build a telemedicine consultation platform. Requirements: Patient mobile app for booking video consultations. Provider app for conducting appointments. Real-time video conferencing using WebRTC or Twilio Video. Digital waiting room with queue management. In-app chat messaging. E-prescription generation. Payment processing for consultation fees. Insurance verification. HIPAA-compliant video streaming and storage. Post-consultation notes. SMS and email appointment reminders. PostgreSQL for appointments. Firebase for real-time communication. AWS S3 for encrypted consultation recordings. Support for 1,000+ daily consultations.`
    },

    {
        id: 'TC006',
        category: 'Healthcare',
        name: 'Hospital Resource Management',
        description: `Create a hospital resource management system. Requirements: Bed availability tracking across departments. Operating room scheduling. Medical equipment tracking with maintenance alerts. Staff scheduling and shift management. Emergency room triage and patient flow. Ambulance dispatch and GPS tracking. Pharmacy inventory management. Blood bank with expiry tracking. Real-time dashboard for hospital capacity. Asset tracking using RFID. Predictive analytics for resource planning. PostgreSQL for operational data. Redis for real-time updates. Kafka for event-driven notifications. Mobile app for staff. Support for 500+ bed hospital.`
    },

    // =========================================================================
    // FINTECH & BANKING (3 cases)
    // =========================================================================
    {
        id: 'TC007',
        category: 'FinTech',
        name: 'Digital Banking Platform',
        description: `Design a modern digital banking platform. Requirements: Web and mobile banking apps for customers. Account management (checking, savings, credit cards). Fund transfers (internal, external, wire). Bill payment with payee management. Mobile check deposit with OCR. Card management (activate, freeze, replace). Transaction history with search. Real-time fraud detection using machine learning. Two-factor authentication and biometric login. Customer service chatbot. Secure messaging with bank. Credit score monitoring. PostgreSQL for accounts and transactions. Redis for session management. Elasticsearch for transaction search. Kafka for fraud detection events. Encryption for sensitive data. Support for 100,000+ customers.`
    },

    {
        id: 'TC008',
        category: 'FinTech',
        name: 'Peer-to-Peer Payment App',
        description: `Build a P2P payment application like Venmo. Requirements: User registration with phone verification. Link bank accounts and cards using Plaid. Send and receive money via username or phone. Social feed for public transactions. Request money with reminders. Bill splitting among multiple users. QR code payments. In-app wallet with balance. Cash out to bank account. Transaction history. Push notifications via Firebase. Instant vs standard transfer options. Fraud monitoring. PostgreSQL for users and transactions. Redis for real-time balance updates. Stripe for payment processing. Support for 50,000+ active users.`
    },

    {
        id: 'TC009',
        category: 'FinTech',
        name: 'Stock Trading Platform',
        description: `Create a stock and crypto trading platform. Requirements: Real-time market data feeds for stocks and crypto. Order placement (market, limit, stop-loss). Portfolio tracking and management. Watchlist with real-time price updates. Price alerts and notifications. Trading charts with technical indicators. Mobile app with biometric authentication. Account funding via bank transfer. Trade execution engine with low latency. Margin trading with risk management. Tax reporting (1099 generation). KYC/AML compliance checks. PostgreSQL for accounts and trades. InfluxDB for time-series market data. Redis for real-time price caching. WebSocket for live updates. Support for 10,000+ active traders.`
    },

    // =========================================================================
    // EDUCATION & E-LEARNING (3 cases)
    // =========================================================================
    {
        id: 'TC010',
        category: 'Education',
        name: 'Learning Management System',
        description: `Design a comprehensive LMS for online education. Requirements: Student portal for course enrollment and learning. Instructor portal for course creation. Course catalog with search and filters. Video hosting and streaming for lectures. Interactive quizzes with auto-grading. Assignment submission and grading. Discussion forums per course. Virtual classroom with video conferencing. Progress tracking and analytics. Certificate generation on completion. Payment processing for paid courses. PostgreSQL for users and courses. MongoDB for course content. AWS S3 for videos. CloudFront CDN for content delivery. Redis for caching. Zoom integration for live classes. Support for 50,000+ students.`
    },

    {
        id: 'TC011',
        category: 'Education',
        name: 'Language Learning App',
        description: `Build an interactive language learning application. Requirements: Personalized learning paths by proficiency level. Interactive lessons with audio and video. Speech recognition for pronunciation practice using Google Speech-to-Text. Vocabulary flashcards with spaced repetition. Grammar exercises with instant feedback. AI chatbot for conversation practice. Live tutoring sessions with native speakers. Writing exercises with AI correction. Progress tracking and skill assessment. Gamification with XP, levels, achievements. Offline mode for mobile learning. PostgreSQL for user progress. Redis for caching learning materials. TensorFlow for AI features. Support for 20+ languages.`
    },

    {
        id: 'TC012',
        category: 'Education',
        name: 'University Student Portal',
        description: `Create a student information system for universities. Requirements: Student portal for registration, grades, schedules. Faculty portal for grade entry and attendance. Course registration with prerequisite checking. Class schedule builder with conflict detection. Grade management and GPA calculation. Transcript generation. Degree audit and graduation tracking. Tuition payment processing. Library integration. Dormitory assignment. Academic calendar management. Email and SMS notifications. Parent portal for guardians. PostgreSQL for academic records. Redis for sessions. Document storage for transcripts. Reporting and analytics. Support for 20,000+ students.`
    },

    // =========================================================================
    // SOCIAL MEDIA & COMMUNICATION (3 cases)
    // =========================================================================
    {
        id: 'TC013',
        category: 'Social Media',
        name: 'Social Networking Platform',
        description: `Build a social networking platform. Requirements: User profiles with photos and interests. Friend/connection system with requests. News feed with algorithmic ranking. Post creation (text, photos, videos, polls). Commenting and nested replies. Like and share functionality. Private messaging and group chats. Photo/video albums. Event creation and RSVP. Groups and communities. Stories feature (24-hour content). Live streaming capability. Video calling using WebRTC. Notification system (in-app, push, email). Content moderation. Search for people, posts, groups. PostgreSQL for user data. Cassandra for feeds. Redis for real-time features. AWS S3 for media. CloudFront CDN. Elasticsearch for search. Kafka for events. ML for recommendations. Support for 1 million+ users.`
    },

    {
        id: 'TC014',
        category: 'Communication',
        name: 'Team Collaboration Tool',
        description: `Design a team collaboration platform like Slack. Requirements: Workspace organization with channels. Direct messaging (1-on-1 and group). Threaded conversations. File sharing and storage. Video and audio calling. Screen sharing. Searchable message history. @mentions and notifications. Third-party app integrations (GitHub, Jira). Bot framework for automation. Status and availability indicators. Rich text formatting and code snippets. Polls and surveys. Desktop apps (Windows, Mac, Linux). Mobile apps with push notifications. PostgreSQL for messages. Redis for real-time features. WebSocket for instant messaging. AWS S3 for files. Elasticsearch for search. OAuth2 for SSO. Support for 10,000+ users per workspace.`
    },

    {
        id: 'TC015',
        category: 'Social Media',
        name: 'Video Sharing Platform',
        description: `Create a video sharing platform like YouTube. Requirements: Video upload with multiple format support. Video transcoding and compression using FFmpeg. Adaptive bitrate streaming (HLS). Video player with quality selection. Thumbnail generation. Channel creation and management. Subscription system. Like, dislike, comment on videos. Playlist creation. Video recommendations using ML. Search with filters. Live streaming capability. Monetization with ads. Analytics for creators (views, watch time). Content moderation. Subtitle support. PostgreSQL for metadata. MongoDB for comments. AWS S3 for videos. CloudFront CDN. Elasticsearch for search. Redis for caching. Kafka for events. Support for 100,000+ videos.`
    },

    // =========================================================================
    // LOGISTICS & TRANSPORTATION (3 cases)
    // =========================================================================
    {
        id: 'TC016',
        category: 'Logistics',
        name: 'Ride-Sharing Platform',
        description: `Build a ride-sharing application. Requirements: Rider mobile app for booking rides. Driver mobile app for accepting rides. Real-time GPS tracking for both. Fare calculation based on distance and time. Multiple ride types (standard, premium, shared). In-app payment processing. Trip history and receipts. Driver rating system. Surge pricing during high demand. Ride scheduling for future. Promo codes and referrals. Driver earnings tracking. Real-time matching algorithm. ETA calculation and route optimization. Push notifications. Safety features (emergency button, trip sharing). PostgreSQL for users and trips. Redis for real-time matching. PostGIS for geospatial queries. Google Maps integration. Stripe for payments. Firebase for notifications. Support for 50,000+ active rides daily.`
    },

    {
        id: 'TC017',
        category: 'Logistics',
        name: 'Food Delivery Platform',
        description: `Design a food delivery system. Requirements: Customer app for browsing restaurants and ordering. Restaurant partner app for order management. Delivery driver app for pickups and deliveries. Menu management for restaurants. Real-time order tracking with GPS. Multiple payment options (card, wallet, cash). Dynamic delivery fee calculation. Restaurant ratings and reviews. Search and filtering by cuisine and price. Favorite restaurants and reorder. Scheduled orders. Driver assignment algorithm. Route optimization. Estimated delivery time. Push notifications for updates. Customer support chat. PostgreSQL for orders. MongoDB for menus. Redis for real-time tracking. PostGIS for location queries. AWS S3 for food images. Google Maps integration. Support for 10,000+ daily orders.`
    },

    {
        id: 'TC018',
        category: 'Transportation',
        name: 'Fleet Management System',
        description: `Create a commercial fleet management system. Requirements: Real-time vehicle tracking using GPS. Route planning and optimization. Driver assignment and scheduling. Fuel consumption monitoring. Maintenance tracking and scheduling. Vehicle health monitoring (engine diagnostics). Geofencing with alerts. Driver behavior analysis (speed, braking). Trip history and reports. Mobile app for drivers. Dispatch management. Document management (licenses, insurance). Expense tracking (fuel, maintenance). Analytics dashboard. Alerts for speeding and unauthorized use. Integration with telematics devices. PostgreSQL for fleet data. InfluxDB for telemetry. Redis for real-time updates. Google Maps integration. MQTT for IoT communication. Kafka for events. Support for 1,000+ vehicles.`
    },

    // =========================================================================
    // ENTERPRISE & PRODUCTIVITY (3 cases)
    // =========================================================================
    {
        id: 'TC019',
        category: 'Enterprise',
        name: 'CRM System',
        description: `Build a customer relationship management system. Requirements: Contact and account management. Lead tracking and qualification. Sales pipeline visualization. Opportunity management with stages. Activity tracking (calls, emails, meetings). Task and reminder system. Email integration (Gmail, Outlook sync). Calendar integration. Quote and proposal generation. Contract management. Sales forecasting and analytics. Dashboard with KPIs. Custom reports. Mobile app for field sales. Marketing campaign management. Customer support ticketing. Role-based access control. Workflow automation. API for integrations. PostgreSQL for CRM data. Redis for caching. Elasticsearch for search. AWS S3 for documents. OAuth2 for authentication. Support for 10,000+ contacts.`
    },

    {
        id: 'TC020',
        category: 'Productivity',
        name: 'Project Management Tool',
        description: `Design a project management platform. Requirements: Project creation and configuration. Task management with assignments. Kanban boards for visual workflow. Gantt charts for timeline view. Sprint planning and tracking. Backlog management. Custom workflows and statuses. Task dependencies. Time tracking and estimation. File attachments. Comments and discussions. @mentions and notifications. Search and filtering. Dashboard with project overview. Reporting and analytics. Team workload view. Calendar view for deadlines. Multiple project views (list, board, timeline). Integration with GitHub and GitLab. Real-time collaboration. PostgreSQL for project data. Redis for real-time updates. WebSocket for collaboration. Elasticsearch for search. Support for 1,000+ projects.`
    },

    {
        id: 'TC021',
        category: 'Enterprise',
        name: 'HR Management System',
        description: `Create a human resources management system. Requirements: Employee database and profiles. Recruitment and applicant tracking. Onboarding workflow automation. Time and attendance tracking. Leave management (request, approval, balance). Payroll processing with tax calculation. Benefits administration. Performance management and reviews. Goal setting and tracking. Training tracking. Employee self-service portal. Manager dashboard. Organization chart. Document management (contracts, policies). Expense reimbursement. Asset management (laptop, phone). Exit management. Compliance reporting. PostgreSQL for HR data. AWS S3 for documents. LDAP integration. Encryption for sensitive data. Support for 5,000+ employees.`
    },

    // =========================================================================
    // IOT & SMART SYSTEMS (3 cases)
    // =========================================================================
    {
        id: 'TC022',
        category: 'IoT',
        name: 'Smart Home Automation',
        description: `Build a smart home automation platform. Requirements: Mobile app for device control (iOS and Android). Web dashboard for management. Support for lights, thermostats, cameras, locks, sensors. Device grouping by rooms. Scene creation (control multiple devices). Automation rules with if-then logic. Time-based scheduling. Voice control integration (Alexa, Google Home). Remote access from anywhere. Real-time device status monitoring. Energy usage tracking. Security camera live streaming. Motion detection alerts. Door/window sensor notifications. Smart lock access logs. Temperature monitoring. Integration with Philips Hue, Nest. User access management. Geofencing triggers. PostgreSQL for config. InfluxDB for sensor data. Redis for device states. MQTT for device communication. WebSocket for real-time updates. AWS IoT Core. Support for 100+ devices per home.`
    },

    {
        id: 'TC023',
        category: 'IoT',
        name: 'Industrial IoT Monitoring',
        description: `Design an IIoT system for manufacturing. Requirements: Real-time equipment monitoring dashboard. Sensor data collection from machines. Predictive maintenance using ML. Alert system for anomalies and failures. Production metrics (OEE, downtime, throughput). Historical data analysis. Remote equipment control. Maintenance scheduling and work orders. Asset tracking and inventory. Quality control monitoring. Energy consumption tracking. Shop floor visualization. Mobile app for technicians. Integration with ERP systems. Data export and reporting. Custom dashboard creation. Multi-factory support. Role-based access. PostgreSQL for config and work orders. InfluxDB for sensor data. MQTT for devices. Kafka for data streaming. TensorFlow for predictive analytics. Edge computing for local processing. Support for 500+ machines.`
    },

    {
        id: 'TC024',
        category: 'IoT',
        name: 'Smart Agriculture Platform',
        description: `Create a precision agriculture platform. Requirements: Farm dashboard with field visualization. Soil moisture and nutrient monitoring. Weather station integration. Crop health monitoring using satellite imagery. Irrigation control and automation. Pest detection using AI. Yield prediction using ML. Equipment tracking and maintenance. Inventory management (seeds, fertilizers). Farm activity logging. Mobile app for field workers. Drone integration for aerial monitoring. Task assignment and scheduling. Financial tracking. Market price integration. Multi-farm support. Historical data and analytics. Alert system for critical conditions. PostgreSQL for farm data. InfluxDB for environmental data. Redis for real-time monitoring. MQTT for sensors. TensorFlow for crop analysis. AWS S3 for imagery. Weather APIs. Support for 1,000+ acres.`
    },

    // =========================================================================
    // MEDIA & ENTERTAINMENT (1 case)
    // =========================================================================
    {
        id: 'TC025',
        category: 'Media',
        name: 'Music Streaming Service',
        description: `Build a music streaming platform like Spotify. Requirements: Music library with millions of tracks. User authentication and profiles. Music player with playback controls. Playlist creation and management. Personalized recommendations using ML. Search (songs, artists, albums, playlists). Social features (follow artists, share playlists). Offline download capability. Audio streaming with adaptive quality. Lyrics display synchronized with playback. Artist pages with discography. Album artwork and metadata. Radio stations and curated playlists. New release notifications. Podcast support. Audio quality settings (low, normal, high, lossless). Cross-device playback sync. Queue management. Subscription management (free, premium). Ad-supported free tier. Analytics for artists. Mobile apps for iOS and Android. Desktop apps. Web player. PostgreSQL for user data. Cassandra for play history. Redis for caching. AWS S3 for audio. CloudFront CDN. Elasticsearch for search. Kafka for events. ML for recommendations. Support for 1 million+ users.`
    },
    {
        id: 'TC026',
        category: 'E-commerce',
        name: 'Standard Microservices E-commerce (Demo)',
        description: `A scalable e-commerce platform with microservices architecture. Users can browse products, add items to cart, and checkout. The system includes product catalog, user authentication, payment processing, order management, and inventory tracking. Uses React frontend, Node.js microservices, PostgreSQL for transactional data, Redis for caching, and RabbitMQ for async communication between services.`
    }
];

/**
 * Helper function to get test case by ID
 */
export function getTestCaseById(id) {
    return architectureTestCases.find(tc => tc.id === id);
}

/**
 * Helper function to get test cases by category
 */
export function getTestCasesByCategory(category) {
    return architectureTestCases.filter(tc => tc.category === category);
}

/**
 * Get all unique categories
 */
export function getCategories() {
    return [...new Set(architectureTestCases.map(tc => tc.category))];
}

/**
 * Get category distribution
 */
export function getCategoryStats() {
    const stats = {};
    architectureTestCases.forEach(tc => {
        stats[tc.category] = (stats[tc.category] || 0) + 1;
    });
    return stats;
}

export default architectureTestCases;