
import { describe, it, expect } from 'vitest';
import { getComponentColor } from '../../utils/diagramLayout';
import { getCloudIcon, getCloudBadge, normalizeServiceName } from '../../utils/cloudIcons';

describe('Component Rendering Rules', () => {

    describe('Component Colors', () => {
        it('should return correct color for frontend', () => {
            const color = getComponentColor('frontend');
            expect(color.bg).toBe('#3b82f6');
        });

        it('should default to service color for unknown type', () => {
            const color = getComponentColor('unknown-type');
            expect(color.bg).toBe('#14b8a6'); // service color
        });
    });

    describe('Cloud Services', () => {
        it('should normalize AWS service names', () => {
            expect(normalizeServiceName('AWS Lambda')).toBe('lambda');
            expect(normalizeServiceName('Amazon S3')).toBe('s3');
            expect(normalizeServiceName('lambda function')).toBe('lambda');
        });

        it('should normalize Azure service names', () => {
            // Note: `normalizeServiceName('Azure SQL')` strips 'Azure ' and returns 'sql'
            // The mapping from 'sql' to 'sql database' happens if provider='azure' is passed
            expect(normalizeServiceName('Azure SQL', 'azure')).toBe('sql database');
            expect(normalizeServiceName('Microsoft Azure Blob Storage', 'azure')).toBe('storage accounts');
            expect(normalizeServiceName('Event Grid', 'azure')).toBe('event grid topics');
            expect(normalizeServiceName('Queue Storage', 'azure')).toBe('queue storage');
        });

        it('should return correct icon URL', () => {
            // AWS Lambda should map to local file
            const awsUrl = getCloudIcon('aws', 'lambda');
            expect(awsUrl).toContain('/cloud-icons/aws/');

            // Azure VM has been changed to be remote instead of mapped to local file in icon map
            const azureUrl = getCloudIcon('azure', 'virtual machine');
            expect(azureUrl).toContain('iconify.design');

            // Unknown service should fallback to default iconify
            const unknownUrl = getCloudIcon('aws', 'unknown-service-xyz');
            expect(unknownUrl).toContain('iconify.design');
        });

        it('should return null for unknown provider', () => {
            expect(getCloudIcon(null, 's3')).toBeNull();
        });

        it('should return badge for provider', () => {
            const badge = getCloudBadge('aws');
            expect(badge.text).toBe('AWS');
        });
    });
});
