
import { describe, it, expect } from 'vitest';
import { getGroupStyle } from '../utils/cloudGroupStyles';

describe('cloudGroupStyles', () => {
    describe('getGroupStyle', () => {
        it('returns correct style for AWS Region', () => {
            const style = getGroupStyle('aws', 'region');
            expect(style).toBeDefined();
            expect(style.iconUrl).toBe('/cloud-icons/aws/Region_32.svg');
            expect(style.borderColor).toBe('#00A4A6');
        });

        it('returns correct style for AWS VPC', () => {
            const style = getGroupStyle('aws', 'vpc');
            expect(style).toBeDefined();
            expect(style.iconUrl).toBe('/cloud-icons/aws/Virtual-private-cloud-VPC_32.svg');
            expect(style.borderColor).toBe('#8C4FFF');
        });

        it('returns correct style for AWS Subnet (no icon)', () => {
            const style = getGroupStyle('aws', 'subnet');
            expect(style).toBeDefined();
            expect(style.iconUrl).toBeNull();
        });

        // Azure Tests
        it('returns correct style for Azure Subscription', () => {
            const style = getGroupStyle('azure', 'subscription');
            expect(style).toBeDefined();
            expect(style.iconUrl).toBe('/cloud-icons/azure/10002-icon-service-Subscriptions.svg');
            expect(style.borderColor).toBe('#0078D4');
        });

        it('returns correct style for Azure Resource Group', () => {
            const style = getGroupStyle('azure', 'resource_group');
            expect(style).toBeDefined();
            expect(style.iconUrl).toBe('/cloud-icons/azure/10007-icon-service-Resource-Groups.svg');
        });

        it('returns correct style for Azure VNet', () => {
            const style = getGroupStyle('azure', 'vnet');
            expect(style).toBeDefined();
            expect(style.iconUrl).toBe('/cloud-icons/azure/10061-icon-service-Virtual-Networks.svg');
        });

        // GCP Tests
        it('returns correct style for GCP Project', () => {
            const style = getGroupStyle('gcp', 'project');
            expect(style).toBeDefined();
            expect(style.iconUrl).toBe('/cloud-icons/gcp/ManagementTools-512-color.svg');
            expect(style.borderColor).toBe('#4285F4');
        });

        it('returns correct style for GCP VPC', () => {
            const style = getGroupStyle('gcp', 'vpc');
            expect(style).toBeDefined();
            expect(style.iconUrl).toBe('/cloud-icons/gcp/Networking-512-color-rgb.svg');
        });

        it('returns correct style for GCP Zone', () => {
            const style = getGroupStyle('gcp', 'zone');
            expect(style).toBeDefined();
            expect(style.iconUrl).toBe('/cloud-icons/gcp/Compute-512-color.svg');
        });

        it('returns default style for unknown group', () => {
            const style = getGroupStyle('aws', 'unknown-group');
            expect(style).toBeDefined();
            expect(style.borderColor).toBe('#999');
        });

        it('returns default style for unknown provider', () => {
            const style = getGroupStyle('unknown-provider', 'region');
            expect(style).toBeDefined();
            expect(style.borderColor).toBe('#999');
        });
    });
});
