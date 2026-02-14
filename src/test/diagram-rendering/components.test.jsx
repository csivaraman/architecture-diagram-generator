
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
            expect(normalizeServiceName('Azure SQL')).toBe('sql database');
            expect(normalizeServiceName('Microsoft Azure Blob Storage')).toBe('blob storage');
        });

        it('should return correct icon URL', () => {
            // We rely on the verified URLs in the util.
            // Just check it returns a string for known service.
            const url = getCloudIcon('aws', 'lambda');
            expect(url).toContain('iconify.design');
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
